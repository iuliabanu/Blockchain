// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract CatalogFinal {

    enum State { Active, Expired }

    struct Promo {
        State state;
        uint start;
        uint end;
        uint percent; // discount percentage
    }

    struct Product {
        bytes32 code;
        string description;
        uint price; // price in points
        bool inStock;
        uint stock;
    }

    Product[] public products;
    mapping(bytes32 => Promo) public productPromos; // per-product promo
    address public admin;


    constructor() {
        admin = msg.sender;
    }


    function addProduct(bytes32 code, string memory description, uint price, uint initialStock) public {
        products.push(Product({
            code: code,
            description: description,
            price: price,
            inStock: initialStock > 0,
            stock: initialStock
        }));
    }

    function increaseStock(bytes32 code, uint amount) public  {
        uint index = findProductIndex(code);
        Product storage p = products[index];
        p.stock += amount;
        if (p.stock > 0) p.inStock = true;
    }

    function decreaseStock(bytes32 code, uint amount) public {
        uint index = findProductIndex(code);
        Product storage p = products[index];
        require(p.stock >= amount, "Insufficient stock");
        p.stock -= amount;
        if (p.stock == 0) p.inStock = false;
    }

    function findProductIndex(bytes32 code) internal view returns (uint) {
        for (uint i = 0; i < products.length; i++) {
            if (products[i].code == code) return i;
        }
    }


    function startProductPromo(bytes32 code, uint ndays, uint percent) external{
        productPromos[code] = Promo({
            start: block.timestamp,
            end: block.timestamp + (ndays * 24 * 60 * 60),
            state: State.Active,
            percent: percent
        });
    }

    function startPromoBatch(bytes32[] memory codes, uint ndays, uint percent) external {
        for (uint i = 0; i < codes.length; i++) {
            productPromos[codes[i]] = Promo({
                start: block.timestamp,
                end: block.timestamp + (ndays * 24 * 60 * 60),
                state: State.Active,
                percent: percent
            });
        }
    }

    function endPromo(bytes32 code) external  {
        Promo storage p = productPromos[code];
        p.end = block.timestamp;
        p.state = State.Expired;
    }

    function isPromoActive(bytes32 code) public view returns (bool) {
        Promo memory p = productPromos[code];
        return p.state == State.Active && block.timestamp >= p.start && block.timestamp <= p.end;
    }


    function getProducts(bool filterInStock, bool filterInPromo) public view returns (Product[] memory) {
        uint count = 0;

        // first count matching products to allocate array
        for (uint i = 0; i < products.length; i++) {
            if (( !filterInStock || products[i].inStock ) &&
                ( !filterInPromo || isPromoActive(products[i].code) )) {
                count++;
            }
        }

        Product[] memory result = new Product[](count);
        uint j = 0;
        for (uint i = 0; i < products.length; i++) {
            if (( !filterInStock || products[i].inStock ) &&
                ( !filterInPromo || isPromoActive(products[i].code) )) {
                result[j] = products[i];
                j++;
            }
        }

        return result;
    }
}
