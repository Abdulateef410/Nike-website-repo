(() => {
  const products = [
    {
      id: "Watches",
      name: "Chronograph Watch",
      alt: "Blue chronograph wristwatch with a silicone strap",
      priceNgn: 38450
    },
    {
      id: "Sneakers",
      name: "Red and White Sneakers",
      alt: "Single red, white, and black athletic sneaker",
      priceNgn: 42950
    },
    {
      id: "Hoodies",
      name: "Fleece-Lined Zip Hoodie",
      alt: "Black zip-up hoodie with a fleece lining",
      priceNgn: 36750
    },
    {
      id: "Sunglass",
      name: "Black Frame Sunglasses",
      alt: "Black rectangular sunglasses with gray lenses and gold accents",
      priceNgn: 18250
    },
    {
      id: "Trainer",
      name: "Blue Monogram Trainers",
      alt: "Blue and white monogram trainer sneakers",
      priceNgn: 78500
    },
    {
      id: "Shoe",
      name: "Black Leather Oxford Shoes",
      alt: "Pair of black leather Oxford dress shoes",
      priceNgn: 68500
    },
    {
      id: "Cap",
      name: "Oakland A's Fitted Cap",
      alt: "Dark green Oakland A's fitted baseball cap",
      priceNgn: 22950
    },
    {
      id: "Shirt",
      name: "Floral Print Short-Sleeve Shirt",
      alt: "White and black floral print short-sleeve shirt",
      priceNgn: 29500
    },
    {
      id: "Backpack",
      name: "Olive Canvas Backpack",
      alt: "Olive green canvas backpack with a flap top",
      priceNgn: 33450
    }
  ];

  if (typeof module !== "undefined" && module.exports) {
    module.exports = products;
  } else {
    window.NikeProducts = products;
  }
})();
