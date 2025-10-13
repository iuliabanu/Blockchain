// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract FidelityPoints {

    address public admin;
    uint public pointValue;

    uint totalPoints; //default internal, if private not visible in extended contracts

    mapping(address => uint) public points;

    constructor(uint _pointValue){
        admin = msg.sender;
        pointValue = _pointValue;
    }

    function addPoints(address client, uint _points) public {
        points[client] += _points;
        _updateTotalPoints(int(_points));
    }

    function setPointValue(uint _pointValue) public{
        pointValue = _pointValue;
    }

    function getTotalValue(address client) public view returns (uint totalValue){
        totalValue = points[client] * pointValue;
    }

    function spendPoints(uint _points) public {
        points[msg.sender] -= _points;
        _updateTotalPoints(-int(_points));
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

}