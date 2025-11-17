# Activity 7: Smart Contract Security & Design Patterns

This repository demonstrates:
- common smart contract vulnerabilities
- secure design patterns through practical auction examples.

---

## Solidity/Ethereum basics

### Members of address:
- **balance**: account balance.
- **code**: code for smart contract account.
- **send**: send given amount of Wei to Address, returns false on failure, forwards 2300 gas.
- **transfer**: send given amount of Wei to Address, reverts on failure forwards 2300 gas.
- **call**(bytes memory): low-level CALL with the given payload, returns success condition and return data, forwards all available gas.
- **delegatecall**(bytes memory): low-level DELEGATE CALL wiht a given payload, returns success condition and rturn data. Runs in the caller context. and **staticcall** for read-only calls.

### Special functions
There are two special functions associated with eth transfers receive() and fallback(). Both are marked public payable. Each contract has its own balance and may receive eth in the following ways:
- **constructor payable**: If the constructor of a contract is payable, when the contract is deployed the msg.value of the transaction calling the constructor will be deposited in the contract balance.

- **function payable**: If a function is payable, when the function is called with msg.value, msg.value will be added to the contract balance.

- **receive function**: each contract may have one receive function. This function is executed after a call to the contract with empty calldata. If the contract has no payable function defined it must have a receive function in order to receive eth.

- **fallback function**: each contract may have one fallback function. This function is executed after a call to the contract if none of the other function match the call or if calldata is empty and there is not receive function. If the contract has no payable function defined or no receive function it must have a fallback function in order to receive eth. It is recommended to define a receive function even if a fallback function is defined to distinguish between transfers and other types of calls.

### Inheritance
Solidity supports multiple inheritance, polymorphism and overriding. Keywords this and super have the standard semantics: current contract, the parent of the current contract in the inheritance hierarchy. Keywords virtual and override are also used with the standard meaning: functions not yet implemented and functions the override the implementation from the base class.
“When a contract inherits from other contracts, only a single contract is created on the blockchain, and the code from all the base contracts is compiled into the created contract.”

---

## Attacks

### Denial of Service (DoS) Attack

**Vulnerability**: Contracts that send funds to multiple addresses in a single transaction can be blocked if any recipient refuses to accept payments.

**Example**: `VulnerableAuction.sol` - The `endAuction()` function attempts to refund all losing bidders in a loop. If any bidder is a malicious contract that reverts in its `receive()` function, the entire transaction fails, preventing the auction from ending.

**Attack Vector**:
```solidity
// Malicious contract blocks auction
receive() external payable {
    revert("I refuse to receive money!");
}
```

**Files (Activity 6)**:
- Vulnerable: `VulnerableAuction.sol` (see `endAuction()` function)
- Attack: `MaliciousRejecter.sol`
- Tests: `test/VulnerableAuction.ts`

**Prevention**: Use the **Withdrawal Pattern** (see Design Patterns below).

---

### Re-entrancy Attack

**Vulnerability**: When a contract transfers funds before updating state, the recipient can call back into the contract and withdraw funds multiple times before the state is updated.

**Example**: `VulnerableAuction.sol` - The `withdraw()` function sends ETH before setting the bid balance to zero. An attacker's `fallback()` function can recursively call `withdraw()` to drain the contract.

**Attack Flow**:
1. Attacker calls `withdraw()`
2. Contract sends ETH → triggers attacker's `fallback()`
3. `fallback()` calls `withdraw()` again (bid still shows as non-zero)
4. Repeat until contract is drained

**Attack Vector**:
```solidity
// Attacker's fallback function recursively withdraws
fallback() external payable {
    if (address(auction).balance >= getBackValue) {
        auction.withdraw(); // Re-enter before state update
    }
}
```

**Files**:
- Vulnerable: `VulnerableAuction.sol` (see `withdraw()` function - transfer before state update)
- Attack: `Attacker.sol` (uses `fallback()` for re-entrancy)
- Secure: `SecureAuction.sol` (follows Checks-Effects-Interactions pattern)
- Tests: `test/ReentrancyAttack.test.ts`

**Prevention**: Follow the **Checks-Effects-Interactions (CEI)** pattern - always update state before external calls.

---

## Design Patterns

### Withdrawal Pattern (Pull over Push)

**Purpose**: Prevent DoS attacks by letting users withdraw their own funds instead of the contract pushing funds to them.

**Implementation**: Instead of sending refunds in a loop, mark funds as available for withdrawal. Each user calls `withdraw()` to pull their funds.

**Example**: `SecureAuction.sol`
```solidity
function withdraw() external {
    require(auctionEnded, "Auction not ended yet");
    require(msg.sender != highestBidder, "Winner cannot withdraw");
    
    uint256 refundAmount = bids[msg.sender];
    require(refundAmount > 0, "No funds to withdraw");
    
    // Checks-Effects-Interactions pattern
    bids[msg.sender] = 0; // Update state FIRST
    
    (bool success, ) = msg.sender.call{value: refundAmount}("");
    require(success, "Withdrawal failed");
}
```

**Benefits**:
- One user's failed withdrawal doesn't affect others
- Immune to DoS attacks
- Prevents re-entrancy when combined with CEI pattern

**Files**: `SecureAuction.sol`, tests in `test/VulnerableAuction.ts` and `test/Auction.ts`

---

### Factory Pattern

**Purpose**: Deploy multiple instances of a contract with consistent initialization and centralized tracking.

**Use Case**: Create individual auction contracts for different NFTs, all managed through a central factory.

**Implementation**: `AuctionFactory.sol`
```solidity
contract AuctionFactory {
    address[] public allAuctions;
    
    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 duration
    ) external returns (address) {
        // Deploy new auction contract
        SecureAuction auction = new SecureAuction(
            nftContract,
            tokenId,
            msg.sender,
            duration
        );
        
        address auctionAddress = address(auction);
        allAuctions.push(auctionAddress);
        
        emit AuctionCreated(auctionAddress, msg.sender);
        return auctionAddress;
    }
    
    function getAuctionsByCreator(address creator) 
        external 
        view 
        returns (address[] memory) 
    {
        // Return all auctions created by a specific user
    }
}
```

**Benefits**:
- Consistent contract deployment
- Centralized registry of all instances
- Access control through factory
- Easy to track and query all contracts

**Files**: `AuctionFactory.sol`, tests in `test/AuctionFactory.ts`

---

### Proxy Pattern (Upgradeability)

**Purpose**: Allow contract logic to be upgraded while preserving storage and address.

**Use Case**: Fix bugs or add features to auction contracts without losing existing auction data or changing contract addresses.

**Implementation**: Separate storage (Proxy) from logic (Implementation)
```solidity
// Proxy Contract - Holds state and delegates calls
contract AuctionProxy {
    address public implementation;
    
    // Storage variables (must match implementation)
    mapping(address => uint256) public bids;
    address public highestBidder;
    uint256 public highestBid;
    
    constructor(address _implementation) {
        implementation = _implementation;
    }
    
    // Delegate all calls to implementation
    fallback() external payable {
        address impl = implementation;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
    
    // Upgrade to new implementation
    function upgradeTo(address newImplementation) external {
        require(msg.sender == admin, "Only admin");
        implementation = newImplementation;
    }
}

// Implementation Contract - Contains logic
contract AuctionImplementation {
    // Same storage layout as Proxy
    mapping(address => uint256) public bids;
    address public highestBidder;
    uint256 public highestBid;
    
    function placeBid() external payable {
        // Logic here
    }
    
    function withdraw() external {
        // Logic here
    }
}
```

**Key Concepts**:
- **delegatecall**: Executes code from Implementation in Proxy's storage context
- **Storage Layout**: Implementation must match Proxy's variable order exactly
- **Upgradeability**: Change Implementation address to upgrade logic

**Benefits**:
- Fix bugs without redeploying
- Add new features while preserving state
- Maintain same contract address
- Preserve user balances and data

**Risks**:
- Storage collision if layouts don't match
- Admin key compromise = full control
- Increased complexity

**Files**: `AuctionProxy.sol`, `AuctionImplementationV1.sol`, `AuctionImplementationV2.sol`, tests in `test/ProxyPattern.ts`

---

## Running Tests
```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/Auction.ts
npx hardhat test test/AuctionFactory.test.ts
npx hardhat test test/ProxyPattern.test.ts
```

---

## IOC.
An Initial Coin Offer is a fundraising model that involves 
exchanging digital currencies for new issued coins or tokens, 
most commonly for ERC20 tokens or other types of tokens. 
Investors are informed about the project’s purposes 
in a white paper. If they decide to participate 
in the fundraising, they are rewarded with tokens or coins 
that they may further use as planned by the project initiators.

Create an ICO with the following specifications:

- Investors will receive a number of tokens in exchange 
for ethers (wei) at a specified price. The type of tokens is a newly created ERC20 token.

- Each unit of ERC20 token has a price. 
An investor can deposit the amount of ether (wei) equivalent to the desired number of tokens.

- The fundraising has the following parameters: startDate, endDate, owner, unitPrice and minTokens. 
The owner is the person that manages the event. minTokens represent the minimum number of tokens required by investors for the new ERC20 token to be emitted.

- If, between startDate and endDate, investors deposit 
an amount of wei enough to cover minToken, 
the owner deploys the ERC20 token and distributes tokens to the investors.

- If, between startDate and endDate, 
the funds deposited by investors are insufficient to reach minTokens, the owner refunds the sums to the respective investors.

Required functions:
- initialize() - Constructor replacement for proxy pattern, set owner, startDate, endDate, unitPrice, minTokens
- invest() - Allow investors to deposit ETH, calculate number of tokens investor will receive.
- finalizeICO() - Called by owner after endDate
- refund() - Withdrawal pattern for failed ICO.

Required events:
```solidity
event InvestmentReceived(address indexed investor, uint256 amount, uint256 tokens);
event ICOFinalized(bool successful, uint256 totalRaised);
event TokensDistributed(address indexed investor, uint256 amount);
event RefundClaimed(address indexed investor, uint256 amount);
```

Upgraded implementation ideas:
- Bonus tokens for early investors (first 24 hours)
- Referral system (bonus for referring new investors)

---

## References

- [Solidity Security Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [OpenZeppelin Upgradeable Contracts](https://docs.openzeppelin.com/upgrades-plugins/1.x/)
- [Ethereum Smart Contract Security](https://ethereum.org/en/developers/docs/smart-contracts/security/)
- [Ethereum Solidity](https://docs.soliditylang.org/_/downloads/en/latest/pdf/)
- [Ethereum Smart Contract Best Practices](https://consensys.github.io/smart-contract-best-practices)

---