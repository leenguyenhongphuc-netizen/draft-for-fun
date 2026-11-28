// Avatar kèm phụ kiện (🎀 🎩 👑 …) dùng chung cho mọi màn hình
export const avaHTML = (av, acc) => `<span class="ava-acc">${av || '🐱'}${acc ? `<i>${acc}</i>` : ''}</span>`;
