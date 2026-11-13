
# SYSTECH COMPUTER SOLUTIONS

A web-based e-commerce application developed for SYSTECH COMPUTER SOLUTIONS, a local computer and laptop shop based in Kumta, Karnataka.

The platform allows customers to explore available laptops, computer accessories, cables, and CCTV cameras. It also provides a shopping cart and an online ordering experience.

## Project Overview

SYSTECH COMPUTER SOLUTIONS is designed to bring a local computer retail store online. Customers can browse products, view product details, add items to their cart, and proceed with the ordering process.

The application also includes backend functionality for managing products and orders through a separate administrative interface.

## Features

- Browse available laptops and computer products.
- Explore different product categories.
- View product details and pricing.
- Add products to the shopping cart.
- Increase or decrease product quantities.
- Manage cart items.
- Place orders through the application.
- Backend API for product and order management.
- Separate administrative management interface.
- Authentication for protected operations.
- Responsive user interface.

## Product Categories

- Laptops
- Computer Accessories
- Cables and Connectors
- CCTV Cameras

## Technology Stack

### Frontend
- React.js
- JavaScript
- HTML5
- CSS3
- Vite
- React Router

### Backend
- Python
- Django
- Django REST Framework
- Django REST Framework Simple JWT

### Database
- MongoDB Atlas / SQLite (depending on the configured environment)

### Development Tools
- Visual Studio Code
- Git and GitHub
- Postman
- Node.js and npm

## Project Structure

```text
SYSTECH/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── assets/
│   │   ├── data/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   └── ...
│
├── README.md
└── .gitignore
```

*Note: The directory structure may vary depending on the final project configuration.*

## Installation and Setup

### Prerequisites

Make sure the following software is installed:

- Node.js
- npm
- Python 3
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
```

### 2. Navigate to the Project

```bash
cd SYSTECH
```

### 3. Frontend Setup

Navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will be available at the local URL displayed in your terminal.

### 4. Backend Setup

Open another terminal and navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment.

For Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run database migrations:

```bash
python manage.py migrate
```

Start the Django development server:

```bash
python manage.py runserver
```

The backend API will be available at:

```text
http://127.0.0.1:8000/
```

## API Testing

Postman can be used to test backend API endpoints, including:

- User authentication
- Product management
- Order management
- Protected administrative operations

## Security

- JWT-based authentication for protected API endpoints.
- Environment variables for sensitive configuration.
- Backend validation for incoming requests.
- Administrative operations are restricted to authorized users.

Never commit API keys, database credentials, secret keys, or other sensitive information to GitHub.

## Future Improvements

- Integration of a reliable online payment gateway.
- Product search and filtering.
- Order tracking for customers.
- Improved inventory management.
- Customer registration and profile management.
- Enhanced administrative dashboard.
- Deployment with a production database and hosting environment.

## Project Information

**Project Name:** SYSTECH COMPUTER SOLUTIONS

**Project Type:** E-commerce Web Application

**Domain:** Computer and Laptop Retail

**Location:** Kumta, Karnataka, India

**Purpose:** To provide an online shopping platform for a local computer retail business.

## Author

Developed as an academic project to gain practical experience in full-stack web development, API integration, database management, and application security.
