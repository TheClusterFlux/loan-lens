# Loan Lens

A modern web application for visualizing and comparing loan repayment strategies. Loan Lens allows you to dynamically model different loan repayment scenarios and see the impact of various factors like interest rates, monthly payments, and additional deposits.

## Features

- **Multiple Loan Scenarios**: Create and compare different loan repayment strategies side by side
- **Interactive Visualization**: Dynamic charts showing loan balance over time
- **Additional Deposits**: Model the impact of making extra payments at specific months
- **Key Metrics**: View time to repayment, total repayment amount, and total interest paid
- **Modern UI**: Responsive design that works on desktops, tablets, and mobile devices

## Technology Stack

- **Frontend**: React with Material UI for a responsive, modern interface
- **Backend**: Node.js with Express for API services and calculations
- **Visualization**: Chart.js for interactive graphs
- **Deployment**: Containerized with Docker for easy deployment on Kubernetes

## Local Development

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Running Locally

1. **Start the backend server**:
   ```
   cd backend
   npm install
   npm start
   ```

2. **Start the frontend development server**:
   ```
   cd frontend
   npm install
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Deployment

This application is configured to be deployed to a Kubernetes cluster using the included Dockerfile and Kubernetes manifests.

### Docker Build

To build the Docker image locally:
```
docker build -t loan-lens .
```

### Kubernetes Deployment

The application is automatically deployed to the Kubernetes cluster via GitHub Actions when changes are pushed to the main branch.

## Usage

1. **Add a new loan**: Click the "Add Loan" button to create a new loan scenario
2. **Configure loan parameters**: Enter the principal amount, interest rate, and monthly payment
3. **Add additional deposits**: Specify months and amounts for extra payments
4. **Compare scenarios**: Create multiple loan tabs to compare different repayment strategies
5. **View the results**: See the visualization and key metrics update in real-time

## License

This project is open source and available under the MIT license.