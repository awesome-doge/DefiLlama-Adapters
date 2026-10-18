const { call } = require('../helper/chain/ton');
const ADDRESSES = require("../helper/coreAssets.json");
const { BigNumber } = require('bignumber.js');
// Both pools are TON Core liquid staking pools with the same get_pool_full_data layout, and each mints
// its own jetton: KTON for the public pool, PKTON for the institutional pool. Neither pool holds the other's jetton.
const POOLS = [
  "EQA9HwEZD_tONfVz6lJS0PVKR5viEiEGyj9AuQewGQVnXPg0", // KTON public pool
  "EQDsW2P6nuP1zopKoNiCYj2xhqDan0cBuULQ8MH4o7dBt_7a", // PKTON institutional pool
];
async function getKtonData(poolAddress) {
  const stacks = await call({
    target: poolAddress,
    abi: 'get_pool_full_data',
    params: [],
    rawStack: true,
  });
  let newContractVersion = stacks.length === 34;
  const formattedStack = stacks.map((i, idx) => {
    if (i[0] === 'num') {
      if (`${i[1]}`.startsWith('-')) {
        return -BigInt(i[1].slice(1));
      }
      return BigInt(i[1]);
    }
    return i;
  });

  const objMapWithNewVersion = ['state', 'halted', 'totalBalance', 'interestRate', 'optimisticDepositWithdrawals', 'depositsOpen', 'instantWithdrawalFee', 'savedValidatorSetHash', 'previousRound', 'currentRound', 'minLoan', 'maxLoan', 'governanceFee', 'accruedGovernanceFee', 'disbalanceTolerance', 'creditStartPriorElectionsEnd', 'poolJettonMinter', 'poolJettonSupply', 'depositPayout', 'requestedForDeposit', 'withdrawalPayout', 'requestedForWithdrawal', 'sudoer', 'sudoerSetAt', 'governor', 'governorUpdateAfter', 'interestManager', 'halter', 'approver', 'controllerCode', 'jettonWalletCode', 'payoutMinterCode', 'projectedTotalBalance', 'projectedPoolSupply'];

  const objMapWithOldVersion = ['state', 'halted', 'totalBalance', 'interestRate', 'optimisticDepositWithdrawals', 'depositsOpen', 'savedValidatorSetHash', 'previousRound', 'currentRound', 'minLoan', 'maxLoan', 'governanceFee', 'poolJettonMinter', 'poolJettonSupply', 'depositPayout', 'requestedForDeposit', 'withdrawalPayout', 'requestedForWithdrawal', 'sudoer', 'sudoerSetAt', 'governor', 'governorUpdateAfter', 'interestManager', 'halter', 'approver', 'controllerCode', 'jettonWalletCode', 'payoutMinterCode', 'projectedTotalBalance', 'projectedPoolSupply'];
  const usedObjMap = newContractVersion ? objMapWithNewVersion : objMapWithOldVersion;
  const result = formattedStack.reduce((acc, curr, index) => {
    acc[usedObjMap[index]] = curr;
    return acc;
  }, {
    instantWithdrawalFee: 0n,
    accruedGovernanceFee: 0n,
    disbalanceTolerance: 30,
    creditStartPriorElectionsEnd: 0n,
    poolJettonMinter: '',
    poolJettonSupply: 0n,
  });

  const { totalBalance, poolJettonSupply, projectedPoolSupply, projectedTotalBalance } = result;
  const tvl = new BigNumber(totalBalance).toNumber();
  return {
    tvl
  };

}

module.exports = {
  timetravel: false,
  methodology: 'TVL is total_balance from get_pool_full_data, which is all TON accounted by the pool (held by the pool and lent to validator controllers), summed over the public KTON pool and the institutional PKTON pool',
  ton: {
    tvl: async (api) => {
      for (const pool of POOLS) {
        const ktonData = await getKtonData(pool);
        api.add(ADDRESSES.ton.TON, ktonData.tvl);
      }
    },
  }
};