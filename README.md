# Warframe Fissures Checker - Frontend

A React-based web application that provides real-time monitoring of Warframe fissures with advanced filtering and long-polling for instant updates.

## 🚀 Features

- **Real-time Updates**: Long-polling implementation for instant fissure data updates
- **Advanced Filtering**: Filter by mission types and difficulty modes
- **Smart Notifications**: Browser notifications when new fissures match your filters
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Auto-discovery**: Automatically discovers new mission types from live data
- **Connection Status**: Visual indicators for connection health
- **Optimized Performance**: Memoized components and efficient re-rendering

## 🛠️ Tech Stack

- **React 18+** with Hooks
- **JavaScript (ES6+)**
- **CSS3** with custom styling
- **Long Polling** for real-time updates
- **Web Notifications API**
- **Fetch API** for HTTP requests

## 📋 Prerequisites

- **Node.js 16+**
- **npm 8+** or **yarn 1.22+**
- Modern web browser with ES6+ support
- Backend API running on `http://localhost:5050`

## 🏃‍♂️ Getting Started

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd warframe-fissures-frontend
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Configure API Endpoint
Update `API_BASE` in `src/components/LongPollingFissures.js`:
```javascript
const API_BASE = "http://localhost:5050/fissures"; // Update if needed
```

### 4. Start Development Server
```bash
npm start
# or
yarn start
```

The application will open at `http://localhost:3000`

### 5. Enable Notifications (Optional)
- Allow notifications when prompted by your browser
- Or manually enable in browser settings for the best experience

## 🎮 Usage

### Basic Usage
1. **View All Fissures**: The app loads all available fissures by default
2. **Filter by Mission Type**: Check mission types you're interested in
3. **Filter by Difficulty**: Choose between All, Normal Only, or Hard Mode Only
4. **Real-time Updates**: New fissures appear automatically without refreshing

### Advanced Features

#### Mission Type Filtering
```
✅ Disruption     ✅ Defense      ❌ Capture
✅ Void Cascade   ❌ Survival     ❌ Exterminate
```

#### Difficulty Filtering
- **All Modes**: Shows both normal and hard mode fissures
- **Normal Only**: Shows only regular fissures
- **Hard Mode Only**: Shows only Steel Path fissures 🔥

#### Auto-Discovery
The app automatically discovers new mission types from live data and adds them to the filter list.

### Connection Status Indicators
- 🟢 **Connected**: Successfully receiving data
- 🟡 **Connecting**: Establishing connection
- 🔵 **Waiting**: Connected, waiting for updates
- 🟠 **Reconnecting**: Attempting to reconnect
- 🔴 **Error**: Connection failed, retrying

## 🏗️ Project Structure

```
src/
├── components/
│   ├── LongPollingFissures.js    # Main component
│   └── LongPollingFissures.css   # Styles
├── App.js                        # Root component
├── App.css                       # Global styles
└── index.js                      # Entry point
```

## 🔧 Configuration

### API Configuration
```javascript
// LongPollingFissures.js
const API_BASE = "http://your-backend-url:5050/fissures";
const DEBOUNCE_DELAY = 500;           // Filter debounce
const LONG_POLL_TIMEOUT = 30000;     // Long poll timeout
const MAX_RECONNECT_DELAY = 30000;   // Max retry delay
```

### Mission Types
Add new mission types to the default list:
```javascript
const MISSION_TYPES = [
    "Assault", "Assassination", "Capture", 
    "Your-New-Mission-Type", // Add here
    // ... existing types
];
```

## 🎨 Customization

### Styling
Modify `LongPollingFissures.css` for custom styling:

```css
/* Custom theme colors */
:root {
    --primary-color: #your-color;
    --secondary-color: #your-color;
    --background-color: #your-color;
}

/* Fissure card styling */
.fissure-card {
    /* Your custom styles */
}

.fissure-card.hard-mode {
    /* Hard mode specific styles */
}
```

### Notifications
Customize notification behavior:
```javascript
const showNotification = useCallback((fissureCount) => {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Custom Title", {
            body: `Your custom message with ${fissureCount} fissures`,
            icon: "/your-custom-icon.png",
            tag: "your-tag",
            requireInteraction: true // Keep notification visible
        });
    }
}, []);
```

## 📱 Responsive Design

The application is fully responsive and works on:
- **Desktop**: Full feature set with hover effects
- **Tablet**: Optimized layout for medium screens
- **Mobile**: Touch-friendly interface with simplified layout

### Breakpoints
```css
/* Mobile */
@media (max-width: 768px) { }

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) { }

/* Desktop */
@media (min-width: 1025px) { }
```

## ⚡ Performance Optimizations

### React Optimizations
- **useMemo**: Expensive calculations cached
- **useCallback**: Event handlers memoized
- **React.memo**: FissureCard component memoized
- **Conditional Rendering**: Only render when needed

### Network Optimizations
- **Long Polling**: Reduces server requests
- **Debounced Filters**: Prevents excessive API calls
- **Smart Reconnection**: Exponential backoff for failures
- **Connection Reuse**: AbortController for cleanup

### Memory Management
- **Cleanup Timeouts**: All timers properly cleared
- **Abort Requests**: Cancelled requests on unmount
- **Efficient Updates**: Only update when data actually changes

## 🔍 Debugging

### Development Tools
Enable detailed logging:
```javascript
// Add to component for debugging
useEffect(() => {
    console.log('Filters changed:', debouncedFilters);
    console.log('Known IDs:', Array.from(knownFissureIdsRef.current));
}, [debouncedFilters]);
```

### Common Issues

#### No Data Loading
1. Check backend is running on correct port
2. Verify CORS configuration
3. Check browser network tab for errors

#### Notifications Not Working
1. Check browser notification permissions
2. Ensure HTTPS for production (required for notifications)
3. Verify notification code execution

#### Performance Issues
1. Check React DevTools for unnecessary re-renders
2. Monitor network tab for excessive requests
3. Verify filter debouncing is working

## 🧪 Testing

### Manual Testing Checklist
- [ ] Initial data loads correctly
- [ ] Filters work (mission types & difficulty)
- [ ] Real-time updates appear automatically
- [ ] Notifications show for new data
- [ ] Connection status updates correctly
- [ ] Error handling works (disconnect backend)
- [ ] Mobile responsive design

### Browser Testing
Test on multiple browsers:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 📦 Building for Production

### Development Build
```bash
npm run build
# or
yarn build
```

### Environment Variables
Create `.env.production`:
```bash
REACT_APP_API_BASE=https://your-production-api.com/fissures
REACT_APP_ENABLE_NOTIFICATIONS=true
```

### Deployment Options

#### Static Hosting (Netlify, Vercel)
```bash
npm run build
# Deploy 'build' folder to your hosting service
```

#### Docker Deployment
```dockerfile
FROM nginx:alpine
COPY build/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

## 🔒 Security Considerations

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; connect-src 'self' https://your-api.com;">
```

### API Security
- Use HTTPS in production
- Implement rate limiting on backend
- Validate all user inputs
- Use secure headers

## 🚀 Performance Tips

### Optimization Checklist
- [ ] Minimize bundle size with code splitting
- [ ] Use production React build
- [ ] Enable gzip compression
- [ ] Implement service worker for caching
- [ ] Optimize images and assets
- [ ] Use CDN for static assets

### Monitoring
```javascript
// Performance monitoring
useEffect(() => {
    const observer = new PerformanceObserver((list) => {
        console.log('Performance entries:', list.getEntries());
    });
    observer.observe({ entryTypes: ['measure'] });
}, []);
```

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style
- Use ESLint for code linting
- Follow React best practices
- Use meaningful variable names
- Add comments for complex logic

### Pull Request Template
```markdown
## Changes Made
- [ ] Feature/Bug description
- [ ] Added tests
- [ ] Updated documentation
- [ ] Tested on multiple browsers

## Screenshots
[Add screenshots if UI changes]
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Warframe](https://www.warframe.com/) for the amazing game
- React team for the excellent framework
- Community for feedback and contributions

## 📞 Support

### Getting Help
1. Check [Issues](../../issues) for existing problems
2. Search documentation for solutions
3. Create detailed issue reports

### Issue Template
```markdown
**Bug Description:**
Clear description of the issue

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. ...

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Environment:**
- Browser: Chrome 91
- OS: Windows 10
- Node: 16.14.0
```

---

**May the Void be with you, Tenno! 🌌**