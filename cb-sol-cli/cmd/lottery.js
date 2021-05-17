const ethers = require('ethers');
const {Command} = require('commander');

const {setupParentArgs, waitForTx, log} = require("./utils")

const constants = require('../constants');

function utf8ToHex(str) 
{
    return Array.from(str).map(c =>
        c.charCodeAt(0) < 128 ? c.charCodeAt(0).toString(16) :
        encodeURIComponent(c).replace(/\%/g,'').toLowerCase()
    ).join('');
}

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
            ethers.utils.hexZeroPad(ethers.utils.bigNumberify(13).toHexString(), 32).substr(2) +            // command len  (32 bytes)
            ethers.utils.hexZeroPad(ethers.utils.hexlify(Number.parseInt(args.op)), 1).substr(2) +          // op           (4 bytes)
            ethers.utils.hexZeroPad(ethers.utils.hexlify(Number.parseInt(args.roundId)), 4).substr(2) +     // roundId      (4 bytes)
            ethers.utils.hexZeroPad(ethers.utils.hexlify(Number.parseInt(args.totalCount)), 4).substr(2) +  // totalCount   (4 bytes)
            ethers.utils.hexZeroPad(ethers.utils.hexlify(Number.parseInt(args.winnerCount)), 4).substr(2);  // winnerCount  (4 bytes)
        } else if (args.op == 1) {
            console.log('construct openLottery() arguments...');
            data = '0x' +
            ethers.utils.hexZeroPad(ethers.utils.bigNumberify(13+args.btcAddr.length).toHexString(), 32).substr(2) +    // command len      (32 bytes)
            ethers.utils.hexZeroPad(ethers.utils.hexlify(Number.parseInt(args.op)), 1).substr(2) +                      // op               (4 bytes)
            ethers.utils.hexZeroPad(ethers.utils.hexlify(Number.parseInt(args.roundId)), 4).substr(2) +                 // roundId          (4 bytes)
            ethers.utils.hexZeroPad(ethers.utils.hexlify(Number.parseInt(args.tokenId)), 4).substr(2) +                 // tokenId          (4 bytes)
            ethers.utils.hexZeroPad(ethers.utils.bigNumberify(args.btcAddr.length).toHexString(), 4).substr(2) +        // btcAddress len   (4 bytes)
            utf8ToHex(args.btcAddr);                                                                                    // btcAddr          (?? bytes)
        } else {
            throw new Error('Unsupported operation, expect 0 or 1');
        }

        log(args, `Constructed deposit:`)
        log(args, `  Resource Id: ${args.resourceId}`)
        log(args, `  Raw: ${data}`)
        log(args, `Creating deposit to initiate transfer!`);

        // Make the deposit
        let tx = await bridgeInstance.deposit(
            args.dest, // destination chain id
            args.resourceId,
            data,
            { gasPrice: args.gasPrice, gasLimit: args.gasLimit}
        );

        await waitForTx(args.provider, tx.hash)
    })

    const setNFTCmd = new Command("set-nft")
    .description("Set NFT admin address")
    .option('--address <address>', 'Lottery contract address', '')
    .option('--nftAdmin <address>', 'New NFT admin address', '')
    .action(async function (args) {
        await setupParentArgs(args, args.parent.parent)

        // Instances
        const lotteryInstance = new ethers.Contract(args.address, constants.ContractABIs.PhalaBTCLottery.abi, args.wallet);

        log(args, `Constructed NFT setting:`)
        log(args, `  Lottery  contract: ${args.address}`)
        log(args, `  NFT admin: ${args.nftAdmin}`)
        log(args, `Creating NFT setting transfer!`);

        // Make the transaction
        let tx = await lotteryInstance.setNFTAdmin(
            args.nftAdmin,
            { gasPrice: args.gasPrice, gasLimit: args.gasLimit}
        );

        await waitForTx(args.provider, tx.hash)
    })

const lotteryCmd = new Command("lottery")

lotteryCmd.addCommand(depositCmd)
lotteryCmd.addCommand(setNFTCmd);

module.exports = lotteryCmd
