import nodemailer from 'nodemailer';

const IS_PROD = !!process.env.SMTP_HOST;
let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (IS_PROD) {
    transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    console.log('📧 SMTP configurado:', process.env.SMTP_HOST);
  } else {
    try {
      const acc = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email', port: 587, secure: false,
        auth: { user: acc.user, pass: acc.pass },
      });
      console.log('📧 Ethereal ativo (dev):', acc.user);
    } catch {
      transporter = null;
      console.warn('⚠️  Sem SMTP configurado — códigos aparecerão somente no console.');
    }
  }

  return transporter;
}

function logCodeToConsole(email, code) {
  const line = '─'.repeat(46);
  console.log(`\n┌${line}┐`);
  console.log(`│  📧  PARA  : ${email.padEnd(32)}│`);
  console.log(`│  🔑  CÓDIGO: ${code.padEnd(32)}│`);
  console.log(`│  ⏱  Expira em 15 minutos               │`);
  console.log(`└${line}┘\n`);
}

export async function sendVerificationCode(email, code) {
  // Em dev: SEMPRE mostra o código no console do backend
  if (!IS_PROD) {
    logCodeToConsole(email, code);
  }

  const t = await getTransporter();
  if (!t) return; // sem transporter disponível — código já foi logado

  try {
    const info = await t.sendMail({
      from:    `"OpsAgenda" <${process.env.SMTP_FROM || 'noreply@opsagenda.com'}>`,
      to:      email,
      subject: 'Seu código de verificação — OpsAgenda',
      html:    buildCodeEmail(code),
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📧 Preview Ethereal: ${previewUrl}\n`);
    }
  } catch (err) {
    // Falha no envio não bloqueia o cadastro — código já está no console
    console.error('Erro ao enviar email (não crítico):', err.message);
  }
}

export async function sendWelcomeEmail(email, name) {
  const t = await getTransporter();
  if (!t) return;

  try {
    await t.sendMail({
      from:    `"OpsAgenda" <${process.env.SMTP_FROM || 'noreply@opsagenda.com'}>`,
      to:      email,
      subject: 'Bem-vindo ao OpsAgenda!',
      html:    `
        <div style="font-family:'Segoe UI',sans-serif;background:#0d1117;color:#e6edf3;padding:40px;max-width:480px;margin:auto;border-radius:12px">
          <h2 style="margin:0 0 8px;font-size:20px">Conta criada com sucesso! 🎉</h2>
          <p style="color:#8b949e;font-size:14px;line-height:1.6;margin:0">
            Olá, <strong style="color:#e6edf3">${name}</strong>! Sua conta no OpsAgenda está pronta.
          </p>
        </div>`,
    });
  } catch (e) {
    console.error('Erro ao enviar email de boas-vindas:', e.message);
  }
}

function buildCodeEmail(code) {
  return `
    <div style="font-family:'Segoe UI',sans-serif;background:#0d1117;color:#e6edf3;padding:40px;max-width:480px;margin:auto;border-radius:12px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:32px">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#1f6feb,#0d419d);border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:16px">OP</div>
        <span style="font-size:16px;font-weight:600">OpsAgenda</span>
      </div>
      <h2 style="margin:0 0 8px;font-size:20px;color:#e6edf3">Confirme seu email</h2>
      <p style="color:#8b949e;font-size:14px;line-height:1.6;margin:0 0 28px">
        Use o código abaixo para concluir seu cadastro. Ele expira em <strong style="color:#e6edf3">15 minutos</strong>.
      </p>
      <div style="background:#161b22;border:1px solid #30363d;border-radius:10px;padding:24px;text-align:center;margin-bottom:24px">
        <p style="margin:0 0 6px;font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:2px">Código de verificação</p>
        <p style="margin:0;font-size:40px;font-weight:700;letter-spacing:12px;color:#388bfd">${code}</p>
      </div>
      <p style="color:#6e7681;font-size:12px">Se você não solicitou este cadastro, ignore este email.</p>
    </div>`;
}
