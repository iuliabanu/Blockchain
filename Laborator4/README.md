# Activity 4: Error handling and events.

## Solidity basics

### Modifiers

Modifiers can be used to change the behavior of functions in a declarative way. For example, you can use a modifier to automatically check a condition prior to executing the function. Multiple modifiers are applied to a function by specifying them in a whitespace-separated list and are evaluated in the order presented. Arbitrary expressions are allowed for modifier arguments. The definition of a modifier includes:

-   **“_”**:  indicates where the code of the function is to be executed.

-   **require statement**:  indicates the condition to be tested.


### Reverts and errors.
Solidity has the following syntax to treat failure situations.

-	**revert statement**: revert statement aborts and reverts all changes performed to the state before the transaction. Revert can indicate the name of the error encountered with additional parameters.

    - revert(string memory reason): abort execution and revert state changes, providing an explanatory string

    - revert CustomError: abort execution and revert state changes, throwing CustomError. 

-	**errors**: can be used in revert statements. They can be defined inside and outside of contracts. The error creates data that is then passed to the caller with the revert operation or catch it in a try/catch statement.

-	**require**: The require function either creates an error without any data or an error of type Error(string). It should be used to ensure valid conditions that cannot be detected until execution time. This includes conditions on inputs or return values from calls to external contracts.

-	**assert**: The assert function creates an error of type Panic(uint256). Assert should only be used to test for internal errors, and to check invariants.


### Events

Events in Solidity are mechanisms for logging data on the blockchain. 
Each event has a name and a list of parameters, and when emitted, 
its data is recorded in the transaction logs associated with the contract address. 
Events enable efficient verification and retrieval. 
Up to three parameters can be marked as indexed, becoming searchable topics. 
Each topic is a 32-byte word that allows filtering by specific argument values. 
Web3 applications commonly subscribe to event topics to detect and react 
to contract activity in real time. 
Events can also be filtered by the contract address that emitted them. 
Storing data in logs consumes significantly less gas than writing to contract storage, though logged data is not accessible to smart contracts—only to external applications.

Keywords:
- **event** declares an event type in a contract.
- **emit** triggers (logs) an event instance during execution.


## Exercises
1. **BonusPoints Contract** Add functions getTotalValue and getRequiredPoints and test the functions with an external contract.

```js
error NotFound();

uint public nbCalls;

function getTotalValue(address client) external returns (uint totalValue){
    nbCalls += 1;
    totalValue = points[client] * pointValue;
}

function getRequiredPoints(address client, uint requiredValue) external returns (uint requiredPoints){
    requiredPoints = requiredValue / pointValue;
        
    if (points[client] == 0) 
        revert NotFound();

    require (this.getTotalValue(client) >= requiredValue, "Insufficient Funds!");

}


//external contract

function calculateRequiredPoints(address client, uint requiredValue) public returns (uint) {
        nbCalls += 1;

        try bonusPointsContract.getRequiredPoints(client, requiredValue) returns (uint requiredPoints) {
            return requiredPoints; 
        } 
        catch Error(string memory reason) {
            nbCallsError += 1;
        } 
        catch Panic(uint errorCode) {
            nbCallsPanic += 1;
        }
        catch (bytes memory r) {
            nbCallsRevert += 1;
        }
}
```    

2.  **Voting Contract** Work on file VotingStart.sol. Test on RemixIDE https://remix.ethereum.org/

-	Add modifiers votingActive, votingEnded (or add a single votingState modifier with an argument of type bool), and onlyAdmin.

-   Use modifiers for functions: setProposalState, registerVoter, vote and winningProposal to ensure that voting is in the required timeframe and only the admin may change the state of a proposal or find the winningProposal after the vote has ended.

-   Add modifier validVote(uint[] memory votes, uint len) to ensure that each vote picks the required number (len) of distinct proposals.


### Docs:
[1] https://docs.soliditylang.org/_/downloads/en/latest/pdf/

[2] https://docs.soliditylang.org/en/latest/control-structures.html#error-handling-assert-require-revert-and-exceptions

[3] https://docs.soliditylang.org/en/latest/contracts.html#modifiers

