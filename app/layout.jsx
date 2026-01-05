import './globals.css';

export const metadata = {
  title: 'ChatGPT-assisted PPSS',
  description: 'Prototype inspired by the PPSS platform described in the referenced study.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
