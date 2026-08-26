import './styles.css';

export const metadata = {
  title: 'Status iônica',
  description: 'Status em tempo real dos serviços da iônica',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
