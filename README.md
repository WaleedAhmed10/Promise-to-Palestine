# Promise to Palestine: Love Beyond Borders

A multilingual fundraising website bringing food, clean water, medical care and shelter to families in Palestine.

Built with PostgreSQL, Express, React and Node. Available in English, Arabic, Urdu, French, Turkish and Spanish.

## Run locally

```bash
cp server/.env.example server/.env
npm run install:all
npm run db:migrate
npm run db:seed
npm run dev:server
npm run dev:client
```

Open http://localhost:5173

## Contributing

Translations and improvements are welcome. To add a language, copy `client/src/i18n/locales/en.json`, translate it, and open a pull request.

## License

MIT