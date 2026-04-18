const url = "https://rgdilkzpuwutpaiugujq.supabase.co/rest/v1/clientes";
const apiKey = "sb_publishable_OTswuvr-89EcAZ3F6Ya7fg_qKG9PenH";

const data = {
  nome: "Teste",
  cpf: "12345678901",
  telefone: "123",
  email: "a@b.com",
  cep: "1",
  endereco: "a",
  numero: "1"
};

fetch(url, {
  method: "POST",
  headers: {
    "apikey": apiKey,
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  },
  body: JSON.stringify(data)
})
.then(res => res.json().then(body => ({ status: res.status, body })))
.then(console.log)
.catch(console.error);
