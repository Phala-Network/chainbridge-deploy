const ethers = require('ethers');
const {Command} = require('commander');

const {setupParentArgs, log} = require("./utils")

const constants = require('../constants');

const depositCmd = new Command("deposit")
    .description("Initiates a bridge transfer")
    .option('--dest <id>', 'Destination chain ID', 1)
    .option('--resourceId <id>', 'ResourceID for transfer', constants.GENERIC_RESOURCEID)
    .option('--bridge <address>', 'Bridge contract address', constants.BRIDGE_ADDRESS)
    .option('--op <value>', "operation type", 0)    // 0: newRound, 1: openLottery
    .option('--roundId <value>', 'Current round id', 0)
    .option('--totalCount <value>', 'Total box count', 0)  // newRound() only
    .option('--winnerCount <value>', 'Total winners of current round', 0) // newRound() only
    .option('--tokenId <value>', 'The token id of the box', 0)     //  openLottery() only
    .option('--btcAddr <address>', 'Claim BTC address', '')  //  openLottery() only
    .action(async function (args) {
        await setupParentArgs(args, args.parent.parent)

        // Instances
        const bridgeInstance = new ethers.Contract(args.bridge, constants.ContractABIs.Bridge.abi, args.wallet);

        let data;
        if(args.op == 0) {
            console.log('construct newRound() arguments...');
            data = '0x' +
            ethers.utils.hexZeroPad(ethers.utils.hexlify(Number.parseInt(args.op)), 1).substr(2) +               // op           (4 bytes)
            ethers.utils.hexZeroPad(ethers.utils.hexlify(Number.parseInt(args.roundId)), 4).substr(2) +          // roundId      (4 bytes)
            ethers.utils.hexZeroPad(ethers.utils.hexlify(Number.parseInt(args.totalCount)), 4).substr(2) +       // totalCount   (4 bytes)
            ethers.utils.hexZeroPad(ethers.utils.hexlify(Number.parseInt(args.winnerCount)), 4).substr(2);       // winnerCount  (4 bytes)
        } else if (args.op == 1) {
            console.log('construct openLottery() arguments...');
            data = '0x' +
            ethers.utils.hexZeroPad(ethers.utils.hexlify(Number.parseInt(args.op)), 1).substr(2) +               // op           (4 bytes)
            ethers.utils.hexZeroPad(ethers.utils.hexlify(Number.parseInt(args.roundId)), 4).substr(2) +          // roundId      (4 bytes)
            ethers.utils.hexZeroPad(ethers.utils.hexlify(Number.parseInt(args.tokenId)), 4).substr(2) +          // tokenId      (4 bytes)
            args.btcAddr.substr(2);                                                             // btcAddr      (?? bytes)
        } else {
            throw new Error('Unsupported operation, expect 0 or 1');
        }

        log(args, `Constructed deposit:`)
        log(args, `  Resource Id: ${args.resourceId}`)
        log(args, `  Raw: ${data}`)
        log(args, `Creating deposit to initiate transfer!`);

        return;

        // Make the deposit
        let tx = await bridgeInstance.deposit(
            args.dest, // destination chain id
            args.resourceId,
            data,
            { gasPrice: args.gasPrice, gasLimit: args.gasLimit}
        );

        await waitForTx(args.provider, tx.hash)
    })

const lotteryCmd = new Command("lottery")

lotteryCmd.addCommand(depositCmd)

module.exports = lotteryCmd
