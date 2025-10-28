# AION Hedera Transparency Dashboard

A React-based dashboard for monitoring and visualizing AION AI Agent's operations on the Hedera network, providing complete transparency into AI decisions, model snapshots, HTS token information, and user activities.

## 🚀 Features

### 📊 **Dashboard Overview**
- Real-time vault metrics (TVL, users, AI decisions)
- Performance charts and analytics
- Recent AI decisions display
- Latest model snapshot information
- Daily activity trends

### 🤖 **AI Decisions Monitoring**
- Complete AI decision history with pagination
- Time-range filtering and search capabilities
- Decision type categorization
- Detailed decision information with HCS/HFS integration
- Real-time decision tracking

### 📸 **Model Snapshots**
- Active model information display
- Model version history and performance scores
- HFS file content viewing
- Model validation status
- Performance comparison charts

### 🪙 **HTS Token Information**
- Complete HTS token details and properties
- Token holder information and distribution
- Supply and treasury management data
- Token key configurations
- Real-time token statistics

### 👥 **User Activity Tracking**
- User search and audit summaries
- Daily activity charts and metrics
- User deposit/withdrawal history
- Activity status monitoring
- Pagination for large user sets

### 📈 **Vault Performance Metrics**
- 30-day performance trends
- APY and TVL tracking
- Activity flow visualization
- AI performance statistics
- Comprehensive analytics dashboard

## 🛠️ Technology Stack

- **React 18** - Modern React with hooks
- **Material-UI (MUI)** - Professional UI components
- **Recharts** - Interactive charts and visualizations
- **Hedera SDK** - Direct blockchain integration
- **Ethers.js** - Smart contract interactions
- **React Router** - Navigation and routing

## 📦 Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start development server
npm start
```

## ⚙️ Configuration

Create a `.env.local` file with the following variables:

```env
REACT_APP_VAULT_ADDRESS=0x...
REACT_APP_HCS_TOPIC_ID=0.0.123456
REACT_APP_HEDERA_NETWORK=testnet
REACT_APP_RPC_URL=https://testnet.hashio.io/api
REACT_APP_MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com
```

## 🏗️ Project Structure

```
frontend/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── Dashboard.js          # Main overview dashboard
│   │   ├── AIDecisions.js        # AI decisions monitoring
│   │   ├── ModelSnapshots.js     # Model snapshot viewer
│   │   ├── HTSTokenInfo.js       # HTS token information
│   │   ├── UserActivity.js       # User activity tracking
│   │   └── VaultMetrics.js       # Performance metrics
│   ├── services/
│   │   └── HederaService.js      # Hedera blockchain integration
│   ├── App.js                    # Main application component
│   ├── App.css                   # Application styles
│   ├── index.js                  # Application entry point
│   └── index.css                 # Global styles
├── package.json
└── README.md
```

## 🔧 Key Components

### HederaService
Central service for blockchain interactions:
- Smart contract communication
- HCS message retrieval
- HFS file content access
- Data formatting and validation

### Dashboard Components
- **Dashboard**: Overview with key metrics and charts
- **AIDecisions**: Detailed AI decision monitoring
- **ModelSnapshots**: Model version and performance tracking
- **HTSTokenInfo**: Complete HTS token information
- **UserActivity**: User behavior and activity analysis
- **VaultMetrics**: Comprehensive performance analytics

## 📱 Responsive Design

The dashboard is fully responsive and optimized for:
- Desktop computers (1200px+)
- Tablets (768px - 1199px)
- Mobile devices (< 768px)

## 🎨 UI/UX Features

- **Modern Design**: Clean, professional interface
- **Real-time Updates**: Live data refresh capabilities
- **Interactive Charts**: Hover effects and detailed tooltips
- **Loading States**: Smooth loading indicators
- **Error Handling**: User-friendly error messages
- **Accessibility**: WCAG compliant components

## 🔍 Data Sources

### Smart Contract Integration
- Direct contract calls for audit functions
- Real-time event monitoring
- Transaction history tracking

### Hedera Services Integration
- **HCS (Hedera Consensus Service)**: AI decision logs
- **HFS (Hedera File Service)**: Model metadata storage
- **HTS (Hedera Token Service)**: Token information

### Mirror Node API
- Historical transaction data
- Account information
- Token statistics

## 🚀 Deployment

### Development
```bash
npm start
```

### Production Build
```bash
npm run build
npm run preview
```

### Docker Deployment
```bash
docker build -t aion-dashboard .
docker run -p 3000:3000 aion-dashboard
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

## 🔒 Security Considerations

- **Read-only Operations**: Dashboard only reads blockchain data
- **No Private Keys**: No sensitive information stored
- **HTTPS Only**: Secure communication protocols
- **Input Validation**: All user inputs are validated
- **Error Boundaries**: Graceful error handling

## 📊 Performance Optimization

- **Code Splitting**: Lazy loading of components
- **Memoization**: React.memo for expensive components
- **Efficient Queries**: Pagination and filtering
- **Caching**: Smart data caching strategies
- **Bundle Optimization**: Webpack optimizations

## 🎯 Demo Features

Perfect for hackathon presentations:
- **Live Data**: Real testnet data integration
- **Interactive Elements**: Clickable charts and tables
- **Professional UI**: Polished, production-ready interface
- **Comprehensive Coverage**: All AION features showcased
- **Real-time Updates**: Live blockchain data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is part of the AION AI Agent system and follows the same licensing terms.

## 🆘 Support

For issues and questions:
- Check the console for error messages
- Verify environment variables are set correctly
- Ensure Hedera testnet connectivity
- Review smart contract deployment status

## 🎉 Hackathon Ready

This dashboard is specifically designed for hackathon demonstrations:
- **Professional appearance** suitable for judges
- **Live data integration** showing real blockchain activity
- **Comprehensive features** demonstrating full system capabilities
- **Interactive elements** for engaging presentations
- **Performance optimized** for smooth demonstrations