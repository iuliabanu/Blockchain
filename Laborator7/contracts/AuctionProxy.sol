// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;


contract AuctionProxy {
    address public implementation;
    address public admin;

    mapping(address => uint256) public bids;
    address public highestBidder;
    uint256 public highestBid;
    bool public auctionEnded;

    event Upgraded(address indexed newImplementation);

    constructor(address _implementation) {
        implementation = _implementation;
        admin = msg.sender;
    }

    function upgradeTo(address newImplementation) external {
        require(msg.sender == admin, "Only admin can upgrade");
        require(newImplementation != address(0), "Invalid implementation");

        implementation = newImplementation;
        emit Upgraded(newImplementation);
    }

    fallback() external payable {
        address impl = implementation;
        require(impl != address(0), "Implementation not set");

        assembly {
            // Copy calldata to memory
            calldatacopy(0, 0, calldatasize())

            // Delegate call to implementation
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)

            // Copy return data
            returndatacopy(0, 0, returndatasize())

            // Return or revert
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {}
}


contract AuctionImplementationV1 {
    // Storage layout MUST match proxy exactly
    address public implementation;
    address public admin;
    mapping(address => uint256) public bids;
    address public highestBidder;
    uint256 public highestBid;
    bool public auctionEnded;

    event BidPlaced(address indexed bidder, uint256 amount);
    event AuctionEnded(address winner, uint256 amount);
    event Withdrawal(address indexed bidder, uint256 amount);

    function placeBid() external payable {
        require(!auctionEnded, "Auction already ended");
        require(msg.value > 0, "Bid must be greater than 0");

        bids[msg.sender] += msg.value;

        if (bids[msg.sender] > highestBid) {
            highestBidder = msg.sender;
            highestBid = bids[msg.sender];
        }

        emit BidPlaced(msg.sender, msg.value);
    }

    function endAuction() external {
        require(!auctionEnded, "Auction already ended");
        require(highestBidder != address(0), "No bids placed");

        auctionEnded = true;
        emit AuctionEnded(highestBidder, highestBid);
    }

    function withdraw() external {
        require(auctionEnded, "Auction not ended yet");
        require(msg.sender != highestBidder, "Winner cannot withdraw");

        uint256 refundAmount = bids[msg.sender];
        require(refundAmount > 0, "No funds to withdraw");

        bids[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "Withdrawal failed");

        emit Withdrawal(msg.sender, refundAmount);
    }
}


contract AuctionImplementationV2 {
    // Storage layout MUST match proxy and V1
    address public implementation;
    address public admin;
    mapping(address => uint256) public bids;
    address public highestBidder;
    uint256 public highestBid;
    bool public auctionEnded;

    // NEW: Additional storage (appended at the end)
    uint256 public minimumBid;
    mapping(address => uint256) public bidCount;

    event BidPlaced(address indexed bidder, uint256 amount);
    event AuctionEnded(address winner, uint256 amount);
    event Withdrawal(address indexed bidder, uint256 amount);
    event MinimumBidUpdated(uint256 newMinimum);

    function placeBid() external payable {
        require(!auctionEnded, "Auction already ended");
        require(msg.value >= minimumBid, "Bid below minimum"); // NEW: minimum bid check

        bids[msg.sender] += msg.value;
        bidCount[msg.sender]++; // NEW: track bid count

        if (bids[msg.sender] > highestBid) {
            highestBidder = msg.sender;
            highestBid = bids[msg.sender];
        }

        emit BidPlaced(msg.sender, msg.value);
    }

    function endAuction() external {
        require(!auctionEnded, "Auction already ended");
        require(highestBidder != address(0), "No bids placed");

        auctionEnded = true;
        emit AuctionEnded(highestBidder, highestBid);
    }

    function withdraw() external {
        require(auctionEnded, "Auction not ended yet");
        require(msg.sender != highestBidder, "Winner cannot withdraw");

        uint256 refundAmount = bids[msg.sender];
        require(refundAmount > 0, "No funds to withdraw");

        bids[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "Withdrawal failed");

        emit Withdrawal(msg.sender, refundAmount);
    }

    // NEW: Set minimum bid (only admin)
    function setMinimumBid(uint256 newMinimum) external {
        require(msg.sender == admin, "Only admin");
        minimumBid = newMinimum;
        emit MinimumBidUpdated(newMinimum);
    }

    // NEW: Get bid statistics
    function getBidStats(address bidder) external view returns (uint256 total, uint256 count) {
        return (bids[bidder], bidCount[bidder]);
    }
}