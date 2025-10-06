# Project 1

This project implements the basic functionalities of an Ethereum wallet. It shows the balance of an account and allows transfers. It relies on the MetaMask extension.

## Denominations

Smaller denominations of Ether easier to use in transactions since transactions usually involve less than 1 eth:
- 1 Ether = 10<sup>3</sup> Finney
- 1 Ether = 10<sup>9</sup> Gwei
- 1 Ether = 10<sup>18</sup> Wei

[Ethereum unit converter](https://info.etherscan.com/ethereum-unit-converter/)

## General Observations - ETH wallets
In an Ethereum network, an account is linked to a pair of public/private keys and has a balance of ETH. Ethereum wallet applications provide access to funds: inspect balances, transfer funds, manage other tokens linked to a private key.

Private keys should be kept on users’ device and never stored on server-side. In Metamask keys are stored in browser’s files and may be recovered with a [mnemonic phrase](
https://support.metamask.io/privacy-and-security/what-is-a-secret-recovery-phrase-and-how-to-keep-your-crypto-wallet-secure/).

A **mnemonic phrase**, also known as a seed phrase or recovery phrase, is a series of words, typically 12 or 24, used to back up and restore a cryptocurrency wallet. The phrase is a human-readable representation of the wallet's private keys, allowing users to regain access to their funds if their device is lost, stolen, or damaged.

**Hot wallets**: online (mobile wallets, web wallets), fast and easy to set up but vulnerable to attacks.

**Cold wallets**: offline (hardware wallets), less convenient for frequent transactions but highly secure for long-term holdings.


## Getting started

### MetaMask accounts
Open the MetaMask browser extension and create at least two Ethereum accounts for the Sepolia testnet. We should be able to demonstrate transfers between accounts. 

### Get Sepolia ETH
Get Sepolia ETH from

https://sepolia-faucet.pk910.de/.

https://faucets.chain.link/sepolia


### Connect Metamask to a Hardhat local network
[Set up an run a development network](https://docs.metamask.io/wallet/how-to/run-devnet/)

In an empty folder create a Hardhat project.
First, install Hardhat using npm. Use **init** to create the project structure.

```
npm install --save hardhat
```

```
npx hardhat --init
```

Edit **hardaht.config.js** file.

```
module.exports = {
  ...
  networks: {
      hardhat: {
        chainId: 1337,
      },
    },
};
```

Run the local network, which will provide 20 default test accounts, each with a balance of 10000 ETH.

```
npx hardhat node
```

### Run the client app with npm 
Clone the git repository and run:

```
npm install
```

```
npm start
```

## Components

The application has two main components:
- **Welcome page**: This page presents generic information and a button that will create a wallet component based on the connection with MetaMask.
- **Wallet page**: This page shows the balance of the account connected with MetaMask. It also opens a pop-up form that allows ETH transfers. 

In **App.js**, you will find a **RouterProvider** for navigation between the two components and a Context providing a Wallet component, which is the **WalletContext** encapsulating a **WalletProvider**.

The implementation for the **WalletContext** is found in utils/Context.js

### Wallet Context provides: 
- **initializeWallet**: a callback function to instantiate the wallet. This function is called in the Welcome page after a successful connection to the MetaMask Wallet.
- **wallet**: the account connected with MetaMask, i.e., the signer of the transactions. 

 <p>
  <img src="https://bafybeifmwoe2p3j6vnkhcr3wlgqochhhgkxjjp6axhalp7txavuxxflcbm.ipfs.w3s.link/arhitecturaAppWallet.png" width="500" title="components">
</p>



### Ether Library

Wallet functionalities are added in utils/EthersUtils.js.

[Ether library docs](https://docs.ethers.org/v5/).

Ethers is a library for interacting with the Ethereum Blockchain and its ecosystem. 

The classes most developers will use are **Provider** and **Wallet**. 

The following code instantiates a BrowserProvider .i.e. MetaMask. We get the active account (the signer Wallet) by calling 'eth_requestAccounts' on the provider.

```js
const ethers = require('ethers');

const provider = new ethers.BrowserProvider(window.ethereum);


if (window.ethereum) {
    provider.send("eth_requestAccounts", []).then(async () => {
      provider.getSigner().then(async (account) => {
        //use account ;
      });
    }
    ).catch(async () => { console.log("err"); });
  } else {
    console.log("err");
}

```

A Wallet can load a private key directly or from any common wallet format. We use the wallet to send transactions. Each transaction has a recipient and a value.

```js
const transactionResponse = await wallet.sendTransaction({
    to,
    value: ethers.parseUnits(amount.toString(), 'wei')
});
```

## Assignment: 

**Add a component listing all transactions of the account** as a list of transaction hashes.

Get the transaction receipts from transaction hashes and add functionalities to get the amount of gas spent for a transaction, the block number, and the block timestamp of the block in which the transaction is included, etc.

Use the transaction hash returned by the Etherscan API.

https://etherscan.io/

https://etherscan.io/apis

https://docs.ethers.org/v5/api/providers/api-providers/#EtherscanProvider

