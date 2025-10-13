// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract Catalog {

    enum State { Active, Expired }

    struct Promo{
        State state;
        uint start;
        uint end;
        uint percent;
    }

    struct Product{
        bytes32 code;
        string description;
        uint price;
        bool inStock;
    }

    Product[] public products;
    Promo public generalPromo;
    address admin;

    constructor(){
        admin = msg.sender;
    }

    function addProduct(bytes32 code, string memory description, uint price) public {
        products.push(Product({
            code: code,
            description: description,
            price: price,
            inStock: true
        }));
    }

    function startPromo(uint ndays, uint percent) external{
        generalPromo = Promo({
            start: block.timestamp,
            end: block.timestamp +  (ndays * 24 * 60 * 60),
            state: State.Active,
            percent: percent
        }) ;
    }

    function endPromo() external {
        generalPromo.end = block.timestamp;
        generalPromo.state = State.Expired;
    }
}