// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract FidelityPoints {

    error NotFound();

    uint public nbCalls;

    address public admin;
    uint public pointValue;

    uint private totalPoints;

    mapping(address => uint) public points;


    event PointsAdded(address indexed client, uint points);
    event PointsSpent(address indexed client, uint points);
    event PointValueChanged(uint oldValue, uint newValue);


    constructor(uint _pointValue) {
        admin = msg.sender;
        pointValue = _pointValue;
    }


    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    function addPoints(address client, uint _points) public onlyAdmin {
        points[client] += _points;
        _updateTotalPoints(int(_points));
        emit PointsAdded(client, _points);
    }

    function spendPoints(uint _points) public {
        require(points[msg.sender] >= _points, "Insufficient points");
        points[msg.sender] -= _points;
        _updateTotalPoints(-int(_points));
        emit PointsSpent(msg.sender, _points);
    }

    function setPointValue(uint _pointValue) public onlyAdmin {
        uint oldValue = pointValue;
        pointValue = _pointValue;
        emit PointValueChanged(oldValue, _pointValue);
    }

    function getTotalValue(address client) public view returns (uint totalValue) {
        totalValue = points[client] * pointValue;
    }

    function _updateTotalPoints(int256 _change) internal {
        if (_change > 0) {
            totalPoints += uint256(_change);
        } else {
            totalPoints -= uint256(-_change);
        }
    }

    function getTotalPoints() public view returns (uint256) {
        return totalPoints;
    }

     function getRequiredPoints(address client, uint requiredValue) external returns (uint requiredPoints){
        nbCalls += 1;
        requiredPoints = requiredValue / pointValue;
        
        if (points[client] == 0) 
            revert NotFound();

        require (this.getTotalValue(client) >= requiredValue, "Insufficient Funds!");
}
}


contract Caller{

    FidelityPoints public bonusPointsContract;
    uint public nbCallsError;
    uint public nbCallsRevert;
    uint public nbCallsPanic;
    uint public nbCalls;


    constructor(address _bonusPointsAddress) {
        bonusPointsContract =
                        FidelityPoints(_bonusPointsAddress);
    }

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

}
