const { sequelize } = require('../config/database');
const AccountBalance = require('../models/AccountBalanceModel');
const LedgerEntry = require('../models/LedgerEntryModel');
const PaymentEvent = require('../models/PaymentEventModel');
const MarketPurchase = require('../models/MarketPurchaseModel');
const MarketProduct = require('../models/MarketProductModel');
const Payout = require('../models/PayoutModel');
const {
  PLATFORM_FEE_RATE,
  SELLER_EARNINGS_RATE,
  calculatePlatformFee,
  calculateSellerEarnings,
  fallbackPlatformFee,
  fallbackSellerEarnings,
} = require('../constants/sellerFees');

const PLATFORM_ACCOUNT_ID = 1;
const DEFAULT_CURRENCY = 'USD';

const toMoney = (value) => Number(parseFloat(value || 0).toFixed(2));

const assertPositiveAmount = (amount, label = 'amount') => {
  const normalized = toMoney(amount);
  if (normalized <= 0) {
    throw new Error(`Invalid ${label}.`);
  }
  return normalized;
};

const getOrCreateAccountBalance = async (accountType, accountId, transaction, currency = DEFAULT_CURRENCY) => {
  let balance = await AccountBalance.findOne({
    where: { accountType, accountId, currency },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!balance) {
    balance = await AccountBalance.create(
      {
        accountType,
        accountId,
        currency,
        totalEarned: 0,
        availableBalance: 0,
        pendingBalance: 0,
        totalWithdrawn: 0,
        version: 0,
      },
      { transaction }
    );
  }

  return balance;
};

const appendLedgerEntry = async ({
  accountType,
  accountId,
  entryType,
  direction,
  amount,
  referenceType,
  referenceId,
  idempotencyKey,
  balanceAfter,
  metadata,
  transaction,
  currency = DEFAULT_CURRENCY,
}) => {
  const existing = await LedgerEntry.findOne({
    where: { idempotencyKey },
    transaction,
  });
  if (existing) {
    return existing;
  }

  return LedgerEntry.create(
    {
      accountType,
      accountId,
      entryType,
      direction,
      amount: toMoney(amount),
      currency,
      referenceType,
      referenceId,
      idempotencyKey,
      balanceAfter: balanceAfter != null ? toMoney(balanceAfter) : null,
      metadata: metadata || null,
    },
    { transaction }
  );
};

const resolvePurchaseAmounts = (purchase) => {
  const gross = toMoney(purchase.amount);
  const sellerEarnings = toMoney(
    purchase.sellerEarnings ?? calculateSellerEarnings(gross)
  );
  const platformFee = toMoney(
    purchase.platformFee ?? calculatePlatformFee(gross)
  );

  return { gross, sellerEarnings, platformFee };
};

const recordPaymentEvent = async ({
  provider,
  eventId,
  eventType,
  referenceType,
  referenceId,
  payload,
  transaction,
}) => {
  const existing = await PaymentEvent.findOne({
    where: { eventId },
    transaction,
  });
  if (existing) {
    return { event: existing, isDuplicate: true };
  }

  const event = await PaymentEvent.create(
    {
      provider,
      eventId,
      eventType,
      referenceType,
      referenceId,
      payload: payload || null,
      processedAt: new Date(),
    },
    { transaction }
  );

  return { event, isDuplicate: false };
};

const finalizeMarketPurchase = async ({
  purchaseId,
  paddleTransactionId = null,
  paymentEventId = null,
  source = 'system',
}) => {
  const idempotencyBase = `sale:market_purchase:${purchaseId}`;

  return sequelize.transaction(async (transaction) => {
    if (paymentEventId) {
      const { isDuplicate } = await recordPaymentEvent({
        provider: 'paddle',
        eventId: paymentEventId,
        eventType: 'transaction.completed',
        referenceType: 'market_purchase',
        referenceId: purchaseId,
        payload: { source, paddleTransactionId },
        transaction,
      });
      if (isDuplicate) {
        const existingLedger = await LedgerEntry.findOne({
          where: { idempotencyKey: `${idempotencyBase}:seller_credit` },
          transaction,
        });
        if (existingLedger) {
          const purchase = await MarketPurchase.findByPk(purchaseId, { transaction });
          return { purchase, alreadyProcessed: true };
        }
      }
    }

    const existingLedger = await LedgerEntry.findOne({
      where: { idempotencyKey: `${idempotencyBase}:seller_credit` },
      transaction,
    });
    if (existingLedger) {
      const purchase = await MarketPurchase.findByPk(purchaseId, { transaction });
      return { purchase, alreadyProcessed: true };
    }

    const purchase = await MarketPurchase.findByPk(purchaseId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!purchase) {
      throw new Error('Purchase record not found.');
    }

    if (purchase.ledgerProcessedAt) {
      return { purchase, alreadyProcessed: true };
    }

    let sellerId = purchase.sellerId;
    if (!sellerId) {
      const product = await MarketProduct.findByPk(purchase.marketProductId, { transaction });
      if (!product) {
        throw new Error('Market product not found for purchase.');
      }
      sellerId = product.sellerId;
      purchase.sellerId = sellerId;
    }

    const { gross, sellerEarnings, platformFee } = resolvePurchaseAmounts(purchase);

    if (toMoney(sellerEarnings + platformFee) !== gross) {
      throw new Error('Purchase split does not match gross amount.');
    }

    purchase.status = 'completed';
    purchase.sellerEarnings = sellerEarnings;
    purchase.platformFee = platformFee;
    purchase.feeRatePlatform = purchase.feeRatePlatform ?? PLATFORM_FEE_RATE;
    purchase.feeRateSeller = purchase.feeRateSeller ?? SELLER_EARNINGS_RATE;
    purchase.currency = purchase.currency || DEFAULT_CURRENCY;
    purchase.paymentProvider = purchase.paymentProvider || 'paddle';
    purchase.completedAt = purchase.completedAt || new Date();
    purchase.ledgerProcessedAt = new Date();
    if (paddleTransactionId) {
      purchase.paddleTransactionId = paddleTransactionId;
    }
    await purchase.save({ transaction });

    const sellerBalance = await getOrCreateAccountBalance('seller', sellerId, transaction);
    sellerBalance.totalEarned = toMoney(Number(sellerBalance.totalEarned) + sellerEarnings);
    sellerBalance.availableBalance = toMoney(Number(sellerBalance.availableBalance) + sellerEarnings);
    sellerBalance.version += 1;
    await sellerBalance.save({ transaction });

    await appendLedgerEntry({
      accountType: 'seller',
      accountId: sellerId,
      entryType: 'sale_credit',
      direction: 'credit',
      amount: sellerEarnings,
      referenceType: 'market_purchase',
      referenceId: purchase.id,
      idempotencyKey: `${idempotencyBase}:seller_credit`,
      balanceAfter: sellerBalance.availableBalance,
      metadata: {
        grossAmount: gross,
        platformFee,
        source,
        paddleTransactionId,
      },
      transaction,
    });

    const platformBalance = await getOrCreateAccountBalance(
      'platform',
      PLATFORM_ACCOUNT_ID,
      transaction
    );
    platformBalance.totalEarned = toMoney(Number(platformBalance.totalEarned) + platformFee);
    platformBalance.availableBalance = toMoney(Number(platformBalance.availableBalance) + platformFee);
    platformBalance.version += 1;
    await platformBalance.save({ transaction });

    await appendLedgerEntry({
      accountType: 'platform',
      accountId: PLATFORM_ACCOUNT_ID,
      entryType: 'platform_fee',
      direction: 'credit',
      amount: platformFee,
      referenceType: 'market_purchase',
      referenceId: purchase.id,
      idempotencyKey: `${idempotencyBase}:platform_fee`,
      balanceAfter: platformBalance.availableBalance,
      metadata: {
        grossAmount: gross,
        sellerEarnings,
        sellerId,
        source,
        paddleTransactionId,
      },
      transaction,
    });

    return { purchase, alreadyProcessed: false };
  });
};

const getSellerFinancials = async (sellerId, currency = DEFAULT_CURRENCY) => {
  const balance = await AccountBalance.findOne({
    where: { accountType: 'seller', accountId: sellerId, currency },
  });

  if (!balance) {
    return {
      totalEarned: 0,
      pendingWithdrawals: 0,
      totalWithdrawn: 0,
      availableBalance: 0,
      currency,
    };
  }

  return {
    totalEarned: toMoney(balance.totalEarned),
    pendingWithdrawals: toMoney(balance.pendingBalance),
    totalWithdrawn: toMoney(balance.totalWithdrawn),
    availableBalance: toMoney(balance.availableBalance),
    currency,
  };
};

const getPlatformFinancials = async (currency = DEFAULT_CURRENCY) => {
  const balance = await AccountBalance.findOne({
    where: { accountType: 'platform', accountId: PLATFORM_ACCOUNT_ID, currency },
  });

  if (!balance) {
    return {
      totalEarned: 0,
      availableBalance: 0,
      currency,
    };
  }

  return {
    totalEarned: toMoney(balance.totalEarned),
    availableBalance: toMoney(balance.availableBalance),
    currency,
  };
};

const requestPayoutWithLedger = async ({ sellerId, amount, country, bankDetails }) => {
  const payoutAmount = assertPositiveAmount(amount, 'payout amount');

  return sequelize.transaction(async (transaction) => {
    const balance = await getOrCreateAccountBalance('seller', sellerId, transaction);

    if (toMoney(balance.availableBalance) < payoutAmount) {
      const err = new Error('Requested amount exceeds available balance.');
      err.statusCode = 400;
      err.available = toMoney(balance.availableBalance);
      throw err;
    }

    const payout = await Payout.create(
      {
        sellerId,
        amount: payoutAmount,
        country,
        bankDetails,
        status: 'pending',
      },
      { transaction }
    );

    balance.availableBalance = toMoney(Number(balance.availableBalance) - payoutAmount);
    balance.pendingBalance = toMoney(Number(balance.pendingBalance) + payoutAmount);
    balance.version += 1;
    await balance.save({ transaction });

    await appendLedgerEntry({
      accountType: 'seller',
      accountId: sellerId,
      entryType: 'payout_reserve',
      direction: 'debit',
      amount: payoutAmount,
      referenceType: 'payout',
      referenceId: payout.id,
      idempotencyKey: `payout:reserve:${payout.id}`,
      balanceAfter: balance.availableBalance,
      metadata: { status: 'pending' },
      transaction,
    });

    return payout;
  });
};

const applyPayoutStatusChange = async (payout, nextStatus, adminNotes) => {
  const currentStatus = payout.status;
  if (currentStatus === nextStatus) {
    return payout;
  }

  const terminalStatuses = ['completed', 'rejected'];
  if (terminalStatuses.includes(currentStatus)) {
    const err = new Error(`Payout is already ${currentStatus} and cannot be changed.`);
    err.statusCode = 409;
    throw err;
  }

  const reservedStatuses = ['pending', 'processing'];
  if (!reservedStatuses.includes(currentStatus)) {
    const err = new Error(`Unsupported payout status transition from ${currentStatus}.`);
    err.statusCode = 400;
    throw err;
  }

  const payoutAmount = toMoney(payout.amount);

  return sequelize.transaction(async (transaction) => {
    const lockedPayout = await Payout.findByPk(payout.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!lockedPayout || lockedPayout.status !== currentStatus) {
      const err = new Error('Payout status changed concurrently. Refresh and try again.');
      err.statusCode = 409;
      throw err;
    }

    const balance = await getOrCreateAccountBalance(
      'seller',
      lockedPayout.sellerId,
      transaction
    );

    if (nextStatus === 'completed') {
      if (toMoney(balance.pendingBalance) < payoutAmount) {
        throw new Error('Insufficient reserved balance for payout completion.');
      }

      balance.pendingBalance = toMoney(Number(balance.pendingBalance) - payoutAmount);
      balance.totalWithdrawn = toMoney(Number(balance.totalWithdrawn) + payoutAmount);
      balance.version += 1;
      await balance.save({ transaction });

      await appendLedgerEntry({
        accountType: 'seller',
        accountId: lockedPayout.sellerId,
        entryType: 'payout_debit',
        direction: 'debit',
        amount: payoutAmount,
        referenceType: 'payout',
        referenceId: lockedPayout.id,
        idempotencyKey: `payout:debit:${lockedPayout.id}`,
        balanceAfter: balance.availableBalance,
        metadata: { previousStatus: currentStatus, nextStatus },
        transaction,
      });

      lockedPayout.status = 'completed';
      lockedPayout.completedAt = new Date();
    } else if (nextStatus === 'rejected') {
      if (toMoney(balance.pendingBalance) < payoutAmount) {
        throw new Error('Insufficient reserved balance for payout reversal.');
      }

      balance.pendingBalance = toMoney(Number(balance.pendingBalance) - payoutAmount);
      balance.availableBalance = toMoney(Number(balance.availableBalance) + payoutAmount);
      balance.version += 1;
      await balance.save({ transaction });

      await appendLedgerEntry({
        accountType: 'seller',
        accountId: lockedPayout.sellerId,
        entryType: 'payout_reversal',
        direction: 'credit',
        amount: payoutAmount,
        referenceType: 'payout',
        referenceId: lockedPayout.id,
        idempotencyKey: `payout:reversal:${lockedPayout.id}`,
        balanceAfter: balance.availableBalance,
        metadata: { previousStatus: currentStatus, nextStatus },
        transaction,
      });

      lockedPayout.status = 'rejected';
    } else if (nextStatus === 'processing') {
      lockedPayout.status = 'processing';
    } else {
      const err = new Error(`Unsupported payout status: ${nextStatus}`);
      err.statusCode = 400;
      throw err;
    }

    if (adminNotes !== undefined) {
      lockedPayout.adminNotes = adminNotes;
    }

    await lockedPayout.save({ transaction });
    return lockedPayout;
  });
};

const backfillCompletedPurchases = async () => {
  const purchases = await MarketPurchase.findAll({
    where: { status: 'completed' },
    order: [['id', 'ASC']],
  });

  let processed = 0;
  for (const purchase of purchases) {
    if (purchase.ledgerProcessedAt) {
      continue;
    }

    try {
      await finalizeMarketPurchase({
        purchaseId: purchase.id,
        paddleTransactionId: purchase.paddleTransactionId,
        source: 'backfill',
      });
      processed += 1;
    } catch (error) {
      console.error(`Ledger backfill failed for purchase ${purchase.id}:`, error.message);
    }
  }

  if (processed > 0) {
    console.log(`Ledger backfill processed ${processed} completed purchase(s).`);
  }

  return processed;
};

const reconcileLegacyPayouts = async () => {
  const payouts = await Payout.findAll({ order: [['id', 'ASC']] });

  for (const payout of payouts) {
    const reserveKey = `payout:reserve:${payout.id}`;
    const reserveExists = await LedgerEntry.findOne({ where: { idempotencyKey: reserveKey } });
    if (reserveExists) {
      continue;
    }

    try {
      await sequelize.transaction(async (transaction) => {
        const balance = await getOrCreateAccountBalance('seller', payout.sellerId, transaction);
        const payoutAmount = toMoney(payout.amount);

        if (['pending', 'processing'].includes(payout.status)) {
          if (toMoney(balance.availableBalance) >= payoutAmount) {
            balance.availableBalance = toMoney(Number(balance.availableBalance) - payoutAmount);
            balance.pendingBalance = toMoney(Number(balance.pendingBalance) + payoutAmount);
            balance.version += 1;
            await balance.save({ transaction });

            await appendLedgerEntry({
              accountType: 'seller',
              accountId: payout.sellerId,
              entryType: 'payout_reserve',
              direction: 'debit',
              amount: payoutAmount,
              referenceType: 'payout',
              referenceId: payout.id,
              idempotencyKey: reserveKey,
              balanceAfter: balance.availableBalance,
              metadata: { status: payout.status, source: 'backfill' },
              transaction,
            });
          }
        } else if (payout.status === 'completed') {
          balance.totalWithdrawn = toMoney(Number(balance.totalWithdrawn) + payoutAmount);
          balance.availableBalance = toMoney(
            Math.max(0, Number(balance.availableBalance) - payoutAmount)
          );
          balance.version += 1;
          await balance.save({ transaction });

          await appendLedgerEntry({
            accountType: 'seller',
            accountId: payout.sellerId,
            entryType: 'payout_debit',
            direction: 'debit',
            amount: payoutAmount,
            referenceType: 'payout',
            referenceId: payout.id,
            idempotencyKey: `payout:debit:${payout.id}`,
            balanceAfter: balance.availableBalance,
            metadata: { source: 'backfill', note: 'legacy completed payout' },
            transaction,
          });
        } else if (payout.status === 'rejected') {
          // Rejected payouts never reserved funds in the ledger backfill path.
        }
      });
    } catch (error) {
      console.error(`Payout backfill failed for payout ${payout.id}:`, error.message);
    }
  }
};

module.exports = {
  PLATFORM_ACCOUNT_ID,
  DEFAULT_CURRENCY,
  toMoney,
  finalizeMarketPurchase,
  getSellerFinancials,
  getPlatformFinancials,
  requestPayoutWithLedger,
  applyPayoutStatusChange,
  backfillCompletedPurchases,
  reconcileLegacyPayouts,
  fallbackPlatformFee,
  fallbackSellerEarnings,
};
