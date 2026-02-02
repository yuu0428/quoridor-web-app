import Board from './components/Board';
import ConnectionPanel from './components/ConnectionPanel';
import { SocketProvider } from './contexts/SocketContext';

export default function App() {
  return (
    <SocketProvider>
      <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#1f2937', margin: '24px 0' }}>コリドール</h1>
        <ConnectionPanel />
        <Board />
      </div>
    </SocketProvider>
  );
}
