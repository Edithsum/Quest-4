// Required Libraries
const { ethers } = require("ethers");
require('dotenv').config();

// Setup
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Token Addresses (Sepolia Testnet)
const USDC = {
    address: "0xA0b86991c6218b36c1d19d4a2e9eb0Ce3606EB48",
    decimals: 6
};
const LINK = {
    address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    decimals: 18
};

// Contract ABIs
const TOKEN_ABI = require('./abis/erc20.json');
const UNISWAP_ROUTER_ABI = require('./abis/uniswapRouter.json');
const UNISWAP_FACTORY_ABI = require('./abis/uniswapFactory.json');
const UNISWAP_POOL_ABI = require('./abis/uniswapPool.json');
const AAVE_LENDING_POOL_ABI = require('./abis/aaveLendingPool.json');

// Contract Addresses (Sepolia Testnet)
const UNISWAP_ROUTER_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const UNISWAP_FACTORY_ADDRESS = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const AAVE_LENDING_POOL_ADDRESS = "0x76B8a634a842a816Cd2740eAFe80e55af82c56f7"; 

// Approve Token Function
async function approveToken(tokenAddress, tokenABI, amount, wallet) {
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);
    const approveAmount = ethers.parseUnits(amount.toString(), USDC.decimals);
    const approveTransaction = await tokenContract.approve(UNISWAP_ROUTER_ADDRESS, approveAmount);
    await approveTransaction.wait();
}

// Get Pool Info Function
async function getPoolInfo(factoryContract, tokenIn, tokenOut) {
    const poolAddress = await factoryContract.getPool(tokenIn.address, tokenOut.address, 3000);
    const poolContract = new ethers.Contract(poolAddress, UNISWAP_POOL_ABI, provider);
    const [token0, token1, fee] = await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee(),
    ]);
    return { poolContract, token0, token1, fee };
}

// Prepare Swap Params Function
async function prepareSwapParams(poolContract, signer, amountIn) {
    return {
        tokenIn: USDC.address,
        tokenOut: LINK.address,
        fee: await poolContract.fee(),
        recipient: signer.address,
        amountIn: amountIn,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0,
    };
}

// Execute Swap Function
async function executeSwap(swapRouter, params, signer) {
    const transaction = await swapRouter.exactInputSingle.populateTransaction(params);
    const receipt = await signer.sendTransaction(transaction);
    console.log(`Swap Executed: https://sepolia.etherscan.io/tx/${receipt.hash}`);
}

// Approve LINK on Aave
async function approveAave(tokenAddress, amount, wallet) {
    const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, wallet);
    const approveAmount = ethers.parseUnits(amount.toString(), LINK.decimals);
    const approveTransaction = await tokenContract.approve(AAVE_LENDING_POOL_ADDRESS, approveAmount);
    await approveTransaction.wait();
}

// Deposit LINK into Aave
async function depositToAave(lendingPool, amount, wallet) {
    const depositTransaction = await lendingPool.deposit(LINK.address, amount, wallet.address, 0);
    await depositTransaction.wait();
    console.log(`Deposit Executed: https://sepolia.etherscan.io/tx/${depositTransaction.hash}`);
}

// Main Function
async function main(swapAmount) {
    const amountIn = ethers.parseUnits(swapAmount.toString(), USDC.decimals);
    try {
        await approveToken(USDC.address, TOKEN_ABI, swapAmount, wallet);
        const factoryContract = new ethers.Contract(UNISWAP_FACTORY_ADDRESS, UNISWAP_FACTORY_ABI, provider);
        const { poolContract } = await getPoolInfo(factoryContract, USDC, LINK);
        const params = await prepareSwapParams(poolContract, wallet, amountIn);
        const swapRouter = new ethers.Contract(UNISWAP_ROUTER_ADDRESS, UNISWAP_ROUTER_ABI, wallet);
        await executeSwap(swapRouter, params, wallet);

        const linkAmount = ethers.parseUnits(swapAmount.toString(), LINK.decimals);
        await approveAave(LINK.address, linkAmount, wallet);
        const lendingPool = new ethers.Contract(AAVE_LENDING_POOL_ADDRESS, AAVE_LENDING_POOL_ABI, wallet);
        await depositToAave(lendingPool, linkAmount, wallet);

    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}

// Execute the main function with a specified swap amount (e.g., 1 USDC)
main(1);
