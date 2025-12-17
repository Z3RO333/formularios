import { redirect } from 'next/navigation';

export default function Home() {
  // Redireciona a raiz para a tela principal de solicitação
  redirect('/solicitar');
}
