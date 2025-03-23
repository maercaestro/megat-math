# 🧠 MEGAT Math

MEGAT Math is an AI-powered math assistant that lets users draw or upload handwritten mathematical expressions — and get instant answers, clean LaTeX output, or full step-by-step solutions.

Built with **Vite** using **React**, **Node.js**, **Tailwind CSS**, and integrated with **OpenAI GPT-4o** and **Llama 3.2 90b Vision**.

![megat-banner](./assets/logo2.png)

---

## 🚀 Features

- ✏️ **Sketch or write equations** using an interactive canvas
- 📷 **Upload images** of handwritten math problems
- 👀 **Claude Vision (Groq)** for OCR and math understanding
- 🧮 **GPT-4 & Llama 3.2** for solving math expressions
- 🧠 **Step-by-step breakdowns** with natural explanations
- 🔒 **Deployed backend on EC2 with HTTPS and NGINX**
- 🌐 **Frontend hosted on Vercel**

---

## 📦 Tech Stack

| Layer        | Technology             |
|--------------|------------------------|
| Frontend     | React + Tailwind CSS   |
| Backend      | Node.js + Express      |
| AI APIs      | Llama 3.2 + GPT-4 + Groq |
| Hosting      | Vercel (frontend) + AWS EC2 (backend) |
| Deployment   | NGINX + SSL + pm2      |

---

## 🖼️ Screenshots

![megat-banner](./assets/app-screenshot.png)

---

## 🛠️ Local Setup

```bash
git clone https://github.com/maercaestro/megat-math.git
cd megat-math

# Frontend setup
cd client
npm install
npm run dev

# Backend setup
cd ../server
npm install
node server.js
```

Create a `.env` file in `/server` with:

```env
OPENAI_API_KEY=your_openai_key
GROQ_API_KEY=your_groq_key
PORT=5001
```

---

## 🌍 Live Demo

🧪 Try it live: [https://megat-math.vercel.app](https://megat-math.vercel.app)

> Backend powered by EC2: [https://megat-net.link](https://megat-net.link)

---

## 🧠 What is MEGAT?

**MEGAT** stands for:

> **Multipurpose Engineered Generative Assistant Transformer**  
> A brand representing all AI projects I build — personal, research, or production.

---

## 📚 Roadmap

- [x] Drawing & image upload
- [x] Llama 3.2 + Groq + GPT-4 integration
- [x] HTTPS-secured backend
- [ ] MCP-powered agent for scheduling
- [ ] Memory + task assistant mode
- [ ] MEGAT Planner (AI To-Do with MCP)

---

## 🧑‍💻 Author

Built with passion by [@maercaestro](https://github.com/maercaestro)  
🎯 First full-stack web app with **zero prior JavaScript experience**.  

---

## 🪄 Acknowledgements

- [OpenAI GPT-4](https://platform.openai.com/)
- [Groq Vision API](https://groq.com/)
- [Vercel](https://vercel.com/)
- [AWS EC2 + NGINX + pm2](https://aws.amazon.com/)

---

## 🪐 License

MIT License. Free to use, remix, and build upon.