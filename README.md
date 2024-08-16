# DeFi Script: Uniswap Swap & Aave Deposit

## Overview of Script

This script demonstrates a decentralized finance (DeFi) workflow by integrating two prominent DeFi protocols: Uniswap and Aave. The primary purpose of the script is to swap USDC for LINK using Uniswap, and then deposit the obtained LINK into Aave's lending pool to earn interest.

### Summary

1. **Token Swap on Uniswap**:
   - The script begins by swapping a specified amount of USDC for LINK on Uniswap V3.
   - The process involves approving the USDC for swap, retrieving the necessary pool information, preparing the swap parameters, and finally executing the swap on Uniswap.

2. **Deposit LINK into Aave**:
   - After the swap, the script approves the LINK tokens for deposit in Aave.
   - The approved LINK is then deposited into Aave's lending pool, where it begins earning interest.

### Key Steps:
- **Approve USDC**: The script first approves the USDC tokens to be used by Uniswap's Swap Router.
- **Retrieve Pool Info**: Retrieves the necessary information about the liquidity pool from Uniswap.
- **Execute Swap**: Executes the swap of USDC to LINK on Uniswap.
- **Approve LINK**: Approves the LINK tokens for deposit in Aave.
- **Deposit LINK**: Deposits the LINK tokens into Aave's lending pool.

## Diagram Illustration

The diagram below illustrates the sequence of steps and interactions between the DeFi protocols (Uniswap and Aave):

![Workflow Diagram](./Image/flow.png)


# Code Explanation

## Overview

This script is designed to interact with two prominent DeFi protocols: Uniswap and Aave. It starts by swapping USDC for LINK on Uniswap, followed by depositing the obtained LINK into Aave's lending pool to earn interest. The script is structured to efficiently handle these interactions using the Ethereum Sepolia testnet.

### Key Functions and Logic

#### 1. **approveToken Function**
```javascript
async function approveToken(tokenAddress, tokenABI, amount, wallet) {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);
    const approveAmount = ethers.parseUnits(amount.toString(), USDC.decimals);
    const approveTransaction = await tokenContract.approve.populateTransaction(
      SWAP_ROUTER_CONTRACT_ADDRESS,
      approveAmount
    );
    const transactionResponse = await wallet.sendTransaction(
      approveTransaction
    );
    console.log(-------------------------------);
    console.log(Sending Approval Transaction...);
    console.log(-------------------------------);
    console.log(Transaction Sent: ${transactionResponse.hash});
    console.log(-------------------------------);
    const receipt = await transactionResponse.wait();
    console.log(
      Approval Transaction Confirmed! https://sepolia.etherscan.io/tx/${receipt.hash}
    );
  } catch (error) {
    console.error("An error occurred during token approval:", error);
    throw new Error("Token approval failed");
  }
}



**Function Purpose**:  
This function is responsible for approving the Uniswap Swap Router to spend a specified amount of USDC on behalf of the user. The approval is necessary for the subsequent swap operation.

**Key Steps**:
- The `tokenContract` is initialized using the token address, ABI, and wallet.
- The `approveAmount` is calculated based on the USDC decimals.
- An approval transaction is prepared and sent to the blockchain.
- The function waits for the transaction to be confirmed, then logs the transaction details.

#### 2. **getPoolInfo Function**
```javascript
async function getPoolInfo(factoryContract, tokenIn, tokenOut) {
  const poolAddress = await factoryContract.getPool(
    tokenIn.address,
    tokenOut.address,
    3000
  );
  if (!poolAddress) {
    throw new Error("Failed to get pool address");
  }
  const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
  const [token0, token1, fee] = await Promise.all([
    poolContract.token0(),
    poolContract.token1(),
    poolContract.fee(),
  ]);
  return { poolContract, token0, token1, fee };
}
```

**Function Purpose**:  
This function retrieves information about the Uniswap V3 liquidity pool for the USDC-LINK pair.

**Key Steps**:
- It calls `getPool` on the factory contract to get the pool address for the specified tokens and fee tier.
- The pool contract is then initialized using the retrieved pool address.
- The function returns the pool contract and additional details like token addresses and fee tier.

#### 3. **prepareSwapParams Function**
```javascript
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
```

**Function Purpose**:  
This function prepares the parameters needed to execute a token swap on Uniswap V3.

**Key Steps**:
- The function gathers essential parameters like the input token, output token, fee, recipient address, and the amount to swap.
- These parameters are then returned in a structured object, which is used in the subsequent swap function.

#### 4. **executeSwap Function**
```javascript
async function executeSwap(swapRouter, params, signer) {
  const transaction = await swapRouter.exactInputSingle.populateTransaction(
    params
  );
  const receipt = await signer.sendTransaction(transaction);
  console.log(-------------------------------);
  console.log(Receipt: https://sepolia.etherscan.io/tx/${receipt.hash});
  console.log(-------------------------------);
}
```

**Function Purpose**:  
This function executes the token swap on Uniswap using the prepared parameters.

**Key Steps**:
- The function populates a transaction using the `exactInputSingle` method of the Uniswap Swap Router with the provided parameters.
- The transaction is signed and sent to the blockchain.
- The function logs the transaction receipt, allowing the user to verify the swap on Etherscan.

#### 5. **Main Function**
```javascript
async function main(swapAmount) {
  const inputAmount = swapAmount;
  const amountIn = ethers.parseUnits(inputAmount.toString(), USDC.decimals);

  try {
    await approveToken(USDC.address, TOKEN_IN_ABI, inputAmount, signer);
    const { poolContract } = await getPoolInfo(factoryContract, USDC, LINK);
    const params = await prepareSwapParams(poolContract, signer, amountIn);
    const swapRouter = new ethers.Contract(
      SWAP_ROUTER_CONTRACT_ADDRESS,
      SWAP_ROUTER_ABI,
      signer
    );
    await executeSwap(swapRouter, params, signer);
  } catch (error) {
    console.error("An error occurred:", error.message);
  }
}
```

**Function Purpose**:  
This is the main function that orchestrates the entire workflow, from approving the USDC for swap to executing the swap and preparing for Aave deposit.

**Key Steps**:
- The swap amount is converted into the correct units.
- USDC is approved for the swap.
- Pool information is retrieved, and swap parameters are prepared.
- The swap is executed on Uniswap.

### Interactions with DeFi Protocols

- **Uniswap**: The script interacts with Uniswap V3 to perform the token swap. It uses Uniswap's Factory contract to get pool information, and the Swap Router contract to execute the swap.
  
- **Aave**: Although the code for depositing LINK into Aave is not explicitly provided in the earlier steps, the concept involves approving the LINK tokens for Aave's lending pool and then depositing them to earn interest. The logic would follow a similar structure to the Uniswap interaction, with a focus on Aave's lending pool contract.

### Conclusion

This script serves as an example of how different DeFi protocols can be integrated to create a seamless financial workflow. By leveraging Uniswap for token swapping and Aave for earning interest on assets, the script highlights the composability and flexibility of the DeFi ecosystem.
```


