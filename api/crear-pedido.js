
MacBookM1Pro, Connected











































Crear pedido · JS
const { MercadoPagoConfig, Preference } = require('mercadopago');
const { Resend } = require('resend');
 
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});
 
const resend = new Resend(process.env.RESEND_API_KEY);
 
module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
 
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
 
  try {
    const { items, payer, shippingCost } = req.body;
 
    if (!items || !items.length) {
      return res.status(400).json({ error: 'No items in cart' });
    }
 
    // ── Mercado Pago ──────────────────────────────────────
    const mpItems = items.map((item) => ({
      id: item.file,
      title: `${item.typeLabel} – ${item.dim}`,
      description: item.file,
      quantity: 1,
      unit_price: item.price,
      currency_id: 'ARS',
    }));
 
    if (shippingCost && shippingCost > 0) {
      mpItems.push({
        id: 'envio-andreani',
        title: 'Envío Andreani',
        quantity: 1,
        unit_price: shippingCost,
        currency_id: 'ARS',
      });
    }
 
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: mpItems,
        payer: {
          name: payer.nombre,
          email: payer.mail,
          phone: { number: payer.telefono },
          address: { zip_code: payer.cp },
        },
        back_urls: {
          success: 'https://lucasmartineza.pics/tienda?pago=ok',
          failure: 'https://lucasmartineza.pics/tienda?pago=error',
          pending: 'https://lucasmartineza.pics/tienda?pago=pendiente',
        },
        auto_return: 'approved',
        statement_descriptor: 'LUCAS MARTINEZ FOTO',
        external_reference: `pedido-${Date.now()}`,
      },
    });
 
    // ── Mail + WhatsApp ───────────────────────────────────
    try {
      const totalItems = items.reduce((s, i) => s + i.price, 0);
      const total = totalItems + (shippingCost || 0);
 
      // Filas de la tabla de fotos en el mail
      const itemsHtml = items.map((item) => `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #222;">
            <a href="https://lucasmartineza.pics/fotos-m/${item.file}" target="_blank">
              <img src="https://lucasmartineza.pics/fotos-m/${item.file}"
                   width="90" height="90"
                   style="object-fit:cover;display:block;border-radius:4px;"
                   alt="${item.file}"/>
            </a>
          </td>
          <td style="padding:10px;border-bottom:1px solid #222;vertical-align:top;color:#ccc;font-family:sans-serif;font-size:13px;">
            <b style="color:#fff;">${item.typeLabel}</b><br/>
            ${item.dim}<br/>
            <a href="https://lucasmartineza.pics/fotos-m/${item.file}"
               style="color:#6af;font-size:11px;text-decoration:none;" target="_blank">
              ver foto →
            </a>
          </td>
          <td style="padding:10px;border-bottom:1px solid #222;vertical-align:top;text-align:right;color:#fff;font-family:sans-serif;font-size:13px;white-space:nowrap;">
            $${item.price.toLocaleString('es-AR')}
          </td>
        </tr>
      `).join('');
 
      // Mensaje de WhatsApp con links a cada foto
      const fotosWa = items.map((item) =>
        `• ${item.typeLabel} ${item.dim}\n  ${encodeURIComponent('→')} https://lucasmartineza.pics/fotos-m/${item.file}`
      ).join('\n');
 
      const waMsg = `Hola ${payer.nombre}! Recibí tu pedido 🎉\n\n${fotosWa}\n\nTotal: $${total.toLocaleString('es-AR')}\n\nTe escribo para coordinar el envío 📦`;
      const waUrl = `https://wa.me/5493513020815?text=${encodeURIComponent(waMsg)}`;
 
      const html = `
        <div style="background:#000;padding:32px;font-family:sans-serif;max-width:560px;margin:0 auto;">
          <h2 style="color:#fff;letter-spacing:0.2em;text-transform:uppercase;font-weight:300;font-size:14px;margin-bottom:24px;">
            🛒 Nuevo pedido — Lucas Martínez Foto
          </h2>
 
          <div style="background:#111;border-radius:8px;padding:20px;margin-bottom:20px;">
            <p style="color:#888;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 12px;">Comprador</p>
            <p style="color:#fff;font-size:14px;margin:0 0 6px;"><b>${payer.nombre}</b></p>
            <p style="color:#ccc;font-size:13px;margin:0 0 4px;">📧 ${payer.mail}</p>
            <p style="color:#ccc;font-size:13px;margin:0 0 4px;">📱 ${payer.telefono}</p>
            <p style="color:#ccc;font-size:13px;margin:0;">📮 CP: ${payer.cp}</p>
          </div>
 
          <div style="background:#111;border-radius:8px;overflow:hidden;margin-bottom:20px;">
            <p style="color:#888;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;margin:0;padding:16px 20px 12px;">Pedido</p>
            <table style="width:100%;border-collapse:collapse;">
              ${itemsHtml}
              ${shippingCost > 0 ? `
              <tr>
                <td colspan="2" style="padding:10px;color:#888;font-family:sans-serif;font-size:13px;">Envío Andreani</td>
                <td style="padding:10px;text-align:right;color:#ccc;font-family:sans-serif;font-size:13px;">$${shippingCost.toLocaleString('es-AR')}</td>
              </tr>` : ''}
              <tr>
                <td colspan="2" style="padding:12px 10px;color:#fff;font-family:sans-serif;font-size:14px;font-weight:bold;">TOTAL</td>
                <td style="padding:12px 10px;text-align:right;color:#fff;font-family:sans-serif;font-size:14px;font-weight:bold;">$${total.toLocaleString('es-AR')}</td>
              </tr>
            </table>
          </div>
 
          <a href="${waUrl}"
             style="display:block;background:#25D366;color:#fff;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-family:sans-serif;font-size:13px;letter-spacing:0.1em;">
            💬 Escribirle por WhatsApp
          </a>
        </div>
      `;
 
      await resend.emails.send({
        from: 'Tienda Lucas Martinez <onboarding@resend.dev>',
        to: 'lucasmartinez.a@gmail.com',
        subject: `Nuevo pedido de ${payer.nombre}`,
        html,
      });
 
    } catch (mailErr) {
      console.error('Mail error (non-fatal):', mailErr);
    }
 
    return res.status(200).json({
      init_point: result.init_point,
      preference_id: result.id,
    });
 
  } catch (err) {
    console.error('MP Error:', err);
    return res.status(500).json({ error: 'Error creando preferencia de pago', detail: err.message });
  }
};
 
Claude finished the response
