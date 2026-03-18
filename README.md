# Portfolio E-commerce Store

A small, polished portfolio e-commerce app built with Node.js, Express, HTML, CSS, and vanilla JavaScript.

## Features

- Homepage with hero section and featured products
- Product listing page with search, filtering, sorting, and pagination
- Product detail page
- Cart with quantity updates and localStorage persistence
- Checkout flow with Stripe-style test card simulation
- Order success page
- Admin dashboard with revenue stats and order history
- JSON-backed mock product and order database
- Responsive design for desktop and mobile

## Tech Stack

- Node.js
- Express
- HTML
- CSS
- JavaScript
- JSON file storage

## Run Locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Test Checkout

Use the prefilled test card on the checkout page:

- Card Number: `4242 4242 4242 4242`
- Expiry: `12/34`
- CVC: `123`

You can also switch to Cash on Delivery for a non-card simulation.

## Routes

- `/`
- `/shop`
- `/product?id=p1`
- `/cart`
- `/checkout`
- `/success`
- `/admin`
- `/contact`

## API Endpoints

- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/orders`
- `GET /api/dashboard`
- `POST /api/orders`
