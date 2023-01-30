import chalk from "chalk";
import dotenv from 'dotenv'
dotenv.config();

import ethers, { Wallet } from "ethers";
import { abi } from "../abi/Monokuma.json";
const wssbsc='wss://bsc-mainnet.nodereal.io/ws/v1/ea49d5c625d34b069be219d151e4f1e8'
const rpcbsc='https://bsc-mainnet.nodereal.io/v1/ea49d5c625d34b069be219d151e4f1e8'
const provider = new ethers.providers.JsonRpcProvider(rpcbsc);
const privateKey='';
// WSS Provider
const providerWSS = new ethers.providers.WebSocketProvider(
    wssbsc
);
const wbnbAddress='0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';
const factoryAddress='0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';
const routerAddress='0x10ED43C718714eb63d5aA57B78B54704E256024E';
const verifiedMonokuma = '0xc0D0D9A7C2BbCB44BD5EBCf8954d7b54e6933E66'; 

const gasLimit=500000;
const gwei=5;
const slippage=5;
const bnbToBuy=2;
const gasPrice = ethers.utils.parseUnits(gwei.toString(), 'gwei')
const recipientWallet = new Wallet(privateKey);
const contract = new ethers.Contract(verifiedMonokuma, abi, providerWSS);
const factory = new ethers.Contract(
  factoryAddress,
  [
    'event PairCreated(address indexed token0, address indexed token1, address pair, uint)',
    'function getPair(address tokenA, address tokenB) external view returns (address pair)'
  ],
  providerWSS
);

const router = new ethers.Contract(
  routerAddress,
  [
    'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
  ],
  providerWSS
);
const WBNB = new ethers.Contract(
  wbnbAddress,
  [{"constant": true,"inputs": [{"name": "_owner","type": "address"}],"name": "balanceOf","outputs": [{"name": "balance","type": "uint256"}],"payable": false,"type": "function"}],
  providerWSS
);

const tradeToken=()=>{
    const blockCurrent=0;
    providerWSS.on('block', async (blockNumber) => {

        if(blockCurrent===0){ 
            console.log('ready to buy');
            let amountOutMin = 0;
            //We buy x amount of the new token for our wbnb
            const amountIn = ethers.utils.parseUnits(bnbToBuy.toString(), 'ether');
            if (slippage > 0 ){
                const amounts = await router.getAmountsOut(amountIn, [wbnbAddress, verifiedMonokuma]);
                //Our execution price will be a bit different, we need some flexbility
                amountOutMin = amounts[1].sub(amounts[1].mul(slippage/100));
            }

            console.log(
                chalk.green.inverse(`Start to buy \n`)
                 +
                 `Buying Token
                 =================
                 tokenIn: ${(bnbToBuy * 1e-18).toString()} ${wbnbAddress} (BNB)
                 tokenOut: ${(amountOutMin / 1e-18).toString()} ${verifiedMonokuma}
               `);

               const tx = await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                        amountIn,
                        amountOutMin,
                        [wbnbAddress, verifiedMonokuma],
                        recipientWallet.address,
                        Date.now() + 1000 * 2, //2 secs
                        {
                        'gasLimit': gasLimit,
                        'gasPrice': gasPrice,
                            'nonce' : 1
                    });
     
      const receipt = await tx.wait(); 
      console.log(`Transaction receipt : https://www.bscscan.com/tx/${receipt.logs[1].transactionHash}`);
      setTimeout(() => {sellTrade()},2000); 
      
        } 

    })

}


const sellTrade = async()=>{

    const amountToSell = await contract.balanceOf(recipientWallet.address);
    const tx = await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        amountToSell.toString(),
        "0",
        [verifiedMonokuma,wbnbAddress],
        recipientWallet.address,
        Date.now() + 1000 * 2, //2 secs
        {
        'gasLimit': gasLimit,
        'gasPrice': gasPrice,
            'nonce' : 1
    });

const receipt = await tx.wait(); 
console.log(`Transaction receipt : https://www.bscscan.com/tx/${receipt.logs[1].transactionHash}`);

setTimeout(() => {process.exit(0)},2000); 
}

const main = async()=>{
    
    contract.on("ContractSwapEnabledUpdated", (enabled)=>{ 
        console.log('Waiting ')
        console.log(enabled) 
        if(enabled){ 
            tradeToken(); 
        } 
    })
}


main();