export default async function handler(req, res) {
  const { action, username, password } = req.body;

  if (action === 'register') {
    // Регистрация
    return res.status(200).json({ success: true });
  }

  if (action === 'login') {
    // Вход
    return res.status(200).json({ success: true, data: { username } });
  }
}