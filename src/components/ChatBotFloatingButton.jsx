import { useState, useRef, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const BOT_RESPONSES = [
	{
		keywords: ['apa yang menarik', 'fitur menarik', 'kenapa', 'unggulan'],
		answer:
			'Website ini menyediakan katalog buku digital, peminjaman online, riwayat baca, dan fitur testimonial siswa. Semua bisa diakses dengan mudah!',
	},
	{
		keywords: ['buku favorit', 'buku terfavorit', 'buku paling banyak'],
		answer: 'Buku favorit siswa saat ini adalah "Laut Bercerita" dan "BUMI (unedited version)".',
	},
	{
		keywords: ['cara pinjam', 'bagaimana pinjam', 'pinjam buku'],
		answer:
			'Untuk meminjam buku, silakan login sebagai siswa, lalu klik tombol "Pinjam" pada buku yang tersedia.',
	},
	{
		keywords: ['testimoni', 'ulasan', 'review', 'memberikan testimoni'],
		answer:
			'Kamu bisa memberikan testimoni setelah mengembalikan buku atau melalui halaman utama pada bagian Testimonial Siswa.',
	},
	{
		keywords: ['jam buka', 'jam operasional', 'buka jam berapa'],
		answer: 'Perpustakaan digital dapat diakses 24 jam, namun jam operasional fisik adalah 08:00 - 16:00.',
	},
	{
		keywords: ['fitur utama', 'fitur website', 'fitur'],
		answer:
			'Fitur utama website ini: katalog buku digital, peminjaman online, riwayat baca, request buku, dan testimonial siswa.',
	},
	{
		keywords: ['halo', 'hi', 'hai', 'hallo'],
		answer: 'Selamat datang di fitur ChatBot Perpustakaan Digital SMKN 40! 👋 Kami siap menjawab pertanyaan kamu tentang website, buku, atau layanan perpustakaan ini.',
	},
	{
		keywords: ['terima kasih', 'makasih', 'thanks'],
		answer: 'Sama-sama! Jika ada pertanyaan lain, silakan chat kembali.',
	},
];

const quickQuestions = [
	'Apa yang menarik di website ini?',
	'Apa buku terfavorit?',
	'Bagaimana cara pinjam buku?',
	'Bagaimana cara memberikan testimoni?',
	'Jam operasional perpustakaan?',
	'Apa saja fitur utama di website ini?',
];

function getBotReply(message) {
	const msg = message.toLowerCase();
	for (const resp of BOT_RESPONSES) {
		if (resp.keywords.some((k) => msg.includes(k))) {
			return resp.answer;
		}
	}
	// Jawaban default jika pertanyaan tidak cocok keyword apapun
	return (
		'Terima kasih atas pertanyaannya! ' +
		'Untuk pertanyaan seputar Perpustakaan Digital SMKN 40, ' +
		'silakan cek fitur katalog, peminjaman buku, testimonial siswa, atau hubungi admin jika butuh bantuan lebih lanjut. ' +
		'Jika pertanyaan Anda spesifik tentang buku, fitur, atau layanan, silakan tulis saja, saya akan berusaha membantu! 😊'
	);
}

export default function ChatBotFloatingButton() {
	const { user } = useContext(AuthContext);
	const [open, setOpen] = useState(false);
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState('');
	const messagesEndRef = useRef(null);
	const inputRef = useRef(null);

	useEffect(() => {
		if (open && messagesEndRef.current) {
			messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
		}
	}, [messages, open]);

	const handleSend = (e) => {
		e.preventDefault();
		if (!input.trim()) return;
		const userMsg = { from: 'user', text: input };
		setMessages((prev) => [...prev, userMsg]);
		setTimeout(() => {
			const botReply = getBotReply(input);
			setMessages((prev) => [...prev, { from: 'bot', text: botReply }]);
		}, 600);
		setInput('');
	};

	const handleQuickQuestion = (question) => {
		setInput('');
		setMessages((prev) => [
			...prev,
			{ from: 'user', text: question },
		]);
		setTimeout(() => {
			const botReply = getBotReply(question);
			setMessages((prev) => [...prev, { from: 'bot', text: botReply }]);
		}, 600);
		setTimeout(() => {
			inputRef.current?.focus();
		}, 700);
	};

	// Cek apakah user adalah siswa yang sudah login
	const isStudent = user && user.role === 'student';

	return (
		<>
			{/* Floating Button */}
			<button
				className="fixed bottom-6 right-6 z-[999] bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg w-16 h-16 flex items-center justify-center text-3xl transition-all"
				onClick={() => setOpen(true)}
				aria-label="Buka ChatBot"
				style={{ boxShadow: '0 4px 24px rgba(239,68,68,0.3)' }}
			>
				<svg
					className="w-8 h-8"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M17 8h2a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-2m12-8V6a2 2 0 00-2-2H7a2 2 0 00-2 2v8a2 2 0 002 2h2"
					/>
				</svg>
			</button>

			{/* Chat Modal */}
			{open && (
				<div className="fixed inset-0 z-[1000] flex items-end justify-end">
					{/* Overlay */}
					<div
						className="absolute inset-0 bg-black/40"
						onClick={() => setOpen(false)}
					/>
					{/* Chat Window */}
					<div className="relative w-full max-w-xs sm:max-w-sm m-6 bg-gray-900 rounded-2xl shadow-2xl border border-red-600 flex flex-col z-10">
						{/* Header */}
						<div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gradient-to-r from-red-600/80 to-red-800/80 rounded-t-2xl">
							<span className="font-bold text-white text-lg flex items-center gap-2">
								<svg
									className="w-6 h-6 text-white"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M17 8h2a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-2m12-8V6a2 2 0 00-2-2H7a2 2 0 00-2 2v8a2 2 0 002 2h2"
									/>
								</svg>
								ChatBot
							</span>
							<button
								className="text-gray-300 hover:text-white"
								onClick={() => setOpen(false)}
								aria-label="Tutup ChatBot"
							>
								<svg
									className="w-6 h-6"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>
						{/* Messages */}
						<div
							className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-900"
							style={{ minHeight: 220, maxHeight: 320 }}
						>
							{!isStudent ? (
								<div className="text-center text-red-400 text-sm py-10">
									Silakan{' '}
									<span className="font-semibold text-white">
										login sebagai siswa
									</span>{' '}
									untuk menggunakan fitur ChatBot.
								</div>
							) : messages.length === 0 ? (
								<div className="text-gray-400 text-sm text-center py-8">
									<span>
										Silakan mulai percakapan dengan mengetik pesan atau klik pertanyaan di bawah
										👇
									</span>
								</div>
							) : (
								messages.map((msg, idx) => (
									<div
										key={idx}
										className={`flex ${
											msg.from === 'user' ? 'justify-end' : 'justify-start'
										}`}
									>
										<div
											className={`px-4 py-2 rounded-2xl text-sm whitespace-pre-line max-w-[80%] ${
												msg.from === 'user'
													? 'bg-red-600 text-white rounded-br-none'
													: 'bg-gray-800 text-gray-100 rounded-bl-none'
											}`}
										>
											{msg.text}
										</div>
									</div>
								))
							)}
							<div ref={messagesEndRef} />
						</div>
						{/* Quick Questions */}
						<div className="px-4 pt-2 pb-1 flex flex-wrap gap-2 border-t border-gray-800 bg-gray-900">
							{quickQuestions.map((q, i) => (
								<button
									key={i}
									type="button"
									className={`bg-gray-800 text-gray-300 text-xs px-3 py-1 rounded-full border border-gray-700 transition
										${isStudent ? 'hover:bg-red-600 hover:text-white' : 'opacity-50 cursor-not-allowed'}`}
									onClick={() => isStudent && handleQuickQuestion(q)}
									disabled={!isStudent}
									tabIndex={isStudent ? 0 : -1}
								>
									{q}
								</button>
							))}
						</div>
						{/* Input */}
						<form
							onSubmit={handleSend}
							className="flex items-center gap-2 px-4 py-3 border-t border-gray-700 bg-gray-900 rounded-b-2xl"
						>
							<input
								type="text"
								ref={inputRef}
								value={input}
								onChange={(e) => setInput(e.target.value)}
								placeholder={isStudent ? "Tulis pertanyaan..." : "Login sebagai siswa untuk chat"}
								className="flex-1 px-3 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
								autoFocus
								maxLength={200}
								disabled={!isStudent}
								tabIndex={isStudent ? 0 : -1}
							/>
							<button
								type="submit"
								className={`bg-red-600 hover:bg-red-700 text-white rounded-full w-10 h-10 flex items-center justify-center transition ${!isStudent ? 'opacity-50 cursor-not-allowed' : ''}`}
								disabled={!isStudent || !input.trim()}
								aria-label="Kirim"
								tabIndex={isStudent ? 0 : -1}
							>
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</svg>
							</button>
						</form>
					</div>
				</div>
			)}
		</>
	);
}
