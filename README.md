# Hotel Haven

Crie a estrutura inicial de um portal de reserva de hotéis conectado ao meu Supabase. 

REGRAS ESTRITAS PARA ECONOMIA E ARQUITETURA:

1. NÃO gere imagens com IA. Use apenas placeholders cinzas simples ou ícones do Lucide React onde houver fotos, pois as imagens virão do Supabase Storage depois.

2. NÃO crie dados fictícios longos no código. Deixe os componentes prontos para lerem dados do Supabase.

3. NÃO crie painéis administrativos, mapas ou checkout de pagamento nesta etapa. Foque apenas na estrutura pública e no banco de dados.

TAREFAS DESTA ETAPA:

1. Banco de Dados (Supabase): Crie as tabelas básicas 'hotels' (id, name, description, city, address, latitude, longitude, rating, image_url, status) e 'rooms' (id, hotel_id, name, description, price_per_night, capacity, amenities, images).

2. Página Inicial (Home): Header limpo com logo e botões "Entrar" e "Cadastrar Hotel". Hero section minimalista com barra de busca funcional (Destino, Check-in, Check-out, Hóspedes) e grid para listar os hotéis vindos do Supabase.

3. Página de Detalhes do Hotel (/hotel/:id): Mostra informações do hotel, espaço reservado para o mapa, e a lista de quartos disponíveis com botão "Selecionar Quarto".

4. Comparador de Quartos/Hotéis: Permita que o usuário marque até 3 quartos ou hotéis e abra um modal ou barra inferior comparando preço, capacidade e comodidades lado a lado.

Use um design moderno, limpo e responsivo com Tailwind CSS e Shadcn UI.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ca5a6ed5-2477-4991-b663-6e5d40e6e358).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
