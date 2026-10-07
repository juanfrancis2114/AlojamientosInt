import { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';
import './react.css';
import App from './App';
import BookingProvider from './BookingProvider';
class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.error('Error de interfaz:', error.message);
  }
  render() {
    return this.state.failed ? (
      <div className="container py-5 alert alert-danger" role="alert">
        No pudimos mostrar esta página.{' '}
        <button className="btn btn-outline-danger" onClick={() => location.reload()}>
          Volver a cargar
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <BookingProvider>
          <App />
        </BookingProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
