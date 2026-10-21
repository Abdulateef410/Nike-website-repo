# Nike Boutique Mart demo

## Run locally

Use Node.js 22.9 or later, then run:

```sh
npm.cmd start
```

Open `http://localhost:3000`. Run `npm.cmd run build` after changing Tailwind classes to rebuild `src/styles.css`.

## Demo checkout

Checkout is a preview flow only. It calculates the cart on the server, creates a temporary demo reference, and does not take payment or save customer details. Product prices are fixed sample NGN values in `src/products.js`. The delivery fee defaults to ₦1,000 and can be changed with `DELIVERY_FEE_NGN` in `.env`.

This demo is not ready to accept real orders. A live store still needs a payment provider, persistent order storage, order notifications, and confirmed product and delivery pricing.
