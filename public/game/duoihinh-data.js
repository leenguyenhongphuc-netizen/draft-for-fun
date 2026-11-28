// Kho câu đố 🧩 Đuổi Hình Bắt Chữ (~1000 câu)
// Mỗi dòng: emoji | đáp án | đáp án khác (nếu có)…
// Gom theo chủ đề; một phần món ăn / đồ uống được ghép tự động từ nguyên liệu × cách làm.

const RAW = {
  'Thành ngữ': `
🐟 ➡️ 🐉|cá chép hoá rồng
🐸 🕳️|ếch ngồi đáy giếng
🎻 🐃|đàn gảy tai trâu
🖌️ 🐍 ➕ 🦶|vẽ rắn thêm chân
🐱 🐭|mèo vờn chuột
🌧️ 🍄 🍄 🍄|mọc như nấm sau mưa|nấm sau mưa
🏹 🎯 🎯|một mũi tên trúng hai đích|một mũi tên hai đích
🐢 🐌|chậm như rùa|chậm như sên|rùa bò
🍯 👄|ngọt như mật|miệng ngọt như mật
🐯 👨 🐯 👶|hổ phụ sinh hổ tử|cha nào con nấy
🐘 🐜|voi và kiến
🦆 ⚡|vịt nghe sấm
🐮 🍃 🌾|trâu chậm uống nước đục|trâu chậm
🐕 🐈|chó mèo|như chó với mèo
💧 🪨 🕳️|nước chảy đá mòn
🍚 🐔 🥚|gà đẻ trứng vàng|con gà đẻ trứng vàng
🔥 🥇|lửa thử vàng|lửa thử vàng gian nan thử sức
🌙 🌟|trăng sao|hái sao trên trời
🏃 🐇|chạy như thỏ|nhanh như thỏ
⚡ ⚡|nhanh như chớp|nhanh như điện
🐷 💤|ngủ như heo|ngủ như lợn
🐂 💪|khoẻ như trâu|khỏe như trâu
🐘 💪|khoẻ như voi|khỏe như voi
🦊 🧠|khôn như cáo|ranh như cáo
🐒 🌳|leo cây như khỉ|nhanh như khỉ
🐟 💧|như cá gặp nước|cá gặp nước
🐦 🏠|chim về tổ|chim có tổ người có tông
🌱 ➡️ 🌳|cây có cội|cây có cội nước có nguồn
💧 🏞️ 🙏|uống nước nhớ nguồn
🍎 🌳 🙏|ăn quả nhớ kẻ trồng cây
🐜 ➕ 🐜 ⛰️|kiến tha lâu cũng đầy tổ
🐓 🌅 📢|gà gáy sáng
🧵 🪡|kim chỉ|như kim với chỉ
🍚 🥢 ❤️|cơm lành canh ngọt
🏠 🔥 🧯|cháy nhà ra mặt chuột
🥚 🐔 ❓|con gà quả trứng|gà hay trứng
🐶 🌙|chó sủa trăng
🐟 🍖|cá lớn nuốt cá bé|cá lớn
🎣 🌊|thả con săn sắt bắt con cá rô|câu cá
🌾 🌾 🐔|gà què ăn quẩn cối xay
🌧️ ☂️|mưa dầm thấm lâu
🌊 🛶|thuận buồm xuôi gió|xuôi chèo mát mái
⛵ 💨|thuận buồm xuôi gió
👂 🧱 🌲|tai vách mạch rừng
🤐 🥇|im lặng là vàng
🍃 🍃 🤝|lá lành đùm lá rách
1️⃣ ⏰ 🥇|thời gian là vàng|thời gian là vàng bạc
🌈 ⛈️|sau cơn mưa trời lại sáng
👀 🐘 🐜|thấy voi hoá kiến
🌳 🐒 ⬆️|khỉ leo cây
💤 🐇 🐢 🏁|thỏ và rùa|rùa và thỏ
🗣️ 🦜|nói như vẹt|học vẹt
🐝 🍯|chăm như ong|siêng như ong
🐜 🐜 🐜|kiến tha mồi
🦉 🌙|cú đêm
🐦 🌅|chim sớm|dậy sớm
👟 🛣️ 🌍|đi một ngày đàng học một sàng khôn|đi một ngày đàng
1️⃣ 🌳 🚫 🌲|một cây làm chẳng nên non
3️⃣ 🌳 ⛰️|ba cây chụm lại nên hòn núi cao
🔥 🌊|nước với lửa|như nước với lửa
🐶 🥱 🪰|chó ngáp phải ruồi
🏃‍♂️ 🌧️ 🌂|mắc mưa
💨 ➕ 💨 🌀|góp gió thành bão
⛰️ ⬆️ 🌊 ⬇️|lên thác xuống ghềnh
🍬 🧒 😊|như trẻ được kẹo
🌸 🌸 🐝|ong bướm
🥚 🧱|trứng chọi đá
🥚 🪨|trứng chọi đá
👁️ 👁️ 🦅|mắt diều hâu|mắt như diều hâu
`,
  'Ngày Tết': `
🌸 🍑|hoa đào|cành đào
🌼 🌳 💛|hoa mai|cây mai|cành mai
🎆 🌃|pháo hoa|bắn pháo hoa
🦁 💃 🥁|múa lân
🍉 🔴|dưa hấu
🍊 🌳|cây quất|cây tắc
🟩 🍃 🍚|bánh chưng
🟢 🌯 🍚|bánh tét
🧧 💰|lì xì|mừng tuổi
🏮 ✨|đèn lồng
🦀 🐟 🦐 🎲|bầu cua|bầu cua tôm cá|bầu cua cá cọp
🙏 🛕|đi chùa|lễ chùa
🏡 🛣️ 🚌|về quê|về quê ăn tết
🧹 🏠 ✨|dọn nhà|dọn dẹp nhà cửa
🎋 🏠|cây nêu
🍬 🥥 🫙|mứt dừa
🍬 🍠|mứt khoai|mứt khoai lang
🌰 🍉|hạt dưa
🎇 🕛|giao thừa|đêm giao thừa
👣 🏠 1️⃣|xông đất|xông nhà
🙏 👴 👵|chúc thọ|mừng thọ
🐉 🏮 💃|múa rồng
🏯 🍎 🍌 🍊|mâm ngũ quả
🍌 🍈 🥭 🍊 🍑|mâm ngũ quả
👘 👗 🇻🇳|áo dài
🎴 🃏 🀄|đánh bài
🍬 🍭 📦|hộp mứt|khay mứt
🥩 🧊 🫙|thịt đông
🥩 🥚 🍲|thịt kho trứng|thịt kho hột vịt
🥒 🥕 🫙|dưa món|dưa kiệu
🧄 🥢 🫙|củ kiệu
🍚 🍬 🥥|xôi gấc
🔴 🍚|xôi gấc
🎊 🏮 🐲|tết nguyên đán
🌕 🏮 🥮|tết trung thu
🥮 🌙|bánh trung thu
👦 🏮 🌕|rước đèn
⭐ 🏮|đèn ông sao
🐓 🗓️ 🔥|ông công ông táo|ông táo
🐟 🌊 🛕|thả cá chép
🧧 🙏 👶|lì xì cho bé
💐 🏠 🎎|chưng hoa
🌺 🪴|chậu hoa|chậu cúc
🍀 🎋|cây phát lộc|phát lộc
🎉 🎤 🎶|hát karaoke|karaoke
🍜 🕛 🌃|ăn khuya
👨‍👩‍👧‍👦 🍲 🎉|sum họp|đoàn viên|sum vầy
🥂 🎊 1️⃣|chúc mừng năm mới|năm mới
🐭 🐂 🐯 🐱|mười hai con giáp|con giáp
🐉 📅|năm rồng|năm thìn
🐍 📅|năm rắn|năm tỵ
🐴 📅|năm ngựa|năm ngọ
🐐 📅|năm dê|năm mùi
🐵 📅|năm khỉ|năm thân
🐓 📅|năm gà|năm dậu
🐶 📅|năm chó|năm tuất
🐷 📅|năm heo|năm hợi
🐭 📅|năm chuột|năm tý
🐃 📅|năm trâu|năm sửu
🐯 📅|năm hổ|năm dần
🐱 📅|năm mèo|năm mão
`,
  'Địa danh': `
🐉 ⬇️ 🌊|hạ long|vịnh hạ long
🗡️ 🌊 🐢|hồ gươm|hồ hoàn kiếm
🌉 🐉 🔥|cầu rồng
🏮 🏘️ 🛶|hội an|phố cổ hội an
🌲 🌸 ❄️ ⛰️|đà lạt
🌸 🌲 🍓|đà lạt
🏯 👑 🌊|huế|cố đô huế
🏝️ 🐚 🌅|phú quốc|đảo phú quốc
⛰️ ☁️ 🌾|sa pa|sapa
🏔️ 3️⃣1️⃣4️⃣3️⃣|fansipan|phan xi păng
🌊 🏖️ 🦞|nha trang
🏍️ 🛣️ 🏙️|sài gòn|thành phố hồ chí minh
🏛️ 🍜 🌳|hà nội
🛶 🌳 🍉|miền tây
🛶 🍍 🏪|chợ nổi|chợ nổi cái răng
🌊 🐢 🏝️|côn đảo
🏜️ 🌊 🏖️|mũi né
🦁 🏝️|đảo sư tử|singapore
🗼 🥐|paris|pháp
🗽 🍎|new york|mỹ
🗻 🍣|nhật bản|núi phú sĩ
🐨 🦘|úc|australia
🐼 🧱|trung quốc
🕌 🐪 🏜️|ả rập|sa mạc
🍕 🛵|ý|italia
🇰🇷 🍜 🎤|hàn quốc
🐘 🛕|thái lan
🍁 ❄️|canada
⚽ 💃 🌴|brazil
🧀 🌷 🚲|hà lan
☕ ⛰️ 🐘|buôn ma thuột|tây nguyên
🍵 ⛰️|thái nguyên|đồi chè
🏯 🧱 🐉|vạn lý trường thành
🗿 🏝️|đảo phục sinh
🔺 🐪 🏜️|kim tự tháp|ai cập
🌋 🏝️|núi lửa|đảo núi lửa
🌊 🧊 🐧|nam cực
🐻‍❄️ ❄️|bắc cực
🏞️ 🦌 🌳|vườn quốc gia
🦏 🦁 🌾|thảo nguyên|châu phi
🛕 🌳 🧱|angkor wat|campuchia
🌺 🏄|hawaii
`,
  'Cổ tích & phim': `
🥥 👦|sọ dừa
🎋 💯|cây tre trăm đốt
🐎 🔥 🗡️|thánh gióng
⛰️ 🌊 👸|sơn tinh thủy tinh|sơn tinh thuỷ tinh
🐉 🧚|con rồng cháu tiên
⭐ 🍏 🦅 💰|ăn khế trả vàng
👧 🐟 👠|tấm cám
👸 👠 🎃|cô bé lọ lem|lọ lem
👧 🧣 🐺|cô bé quàng khăn đỏ|khăn đỏ
❄️ 👸 7️⃣|bạch tuyết|bạch tuyết và bảy chú lùn
🧜‍♀️ 🌊|nàng tiên cá
🐷 🐷 🐷 🐺|ba chú heo con|ba chú lợn con
🧞 🪔|cây đèn thần|aladdin
🐒 ☁️ 🪄|tôn ngộ không|tây du ký
🐒 🐷 🐴 🙏|tây du ký
🌙 👩 🌳|chú cuội|chị hằng
🌳 👦 🌕|chú cuội
🍉 🏝️|mai an tiêm|sự tích dưa hấu
🐢 🗡️ 👑|sự tích hồ gươm
🍚 🍬 🎂|bánh chưng bánh giầy
🦁 👑|vua sư tử
🤥 👃|pinocchio
🐻 🍯|gấu pooh
🦸 🕷️|người nhện
🦇 🦸|người dơi
👸 ❄️ ⛄|nữ hoàng băng giá
🐭 🧀 🐱|tom và jerry
👻 🏚️|ngôi nhà ma
🦖 🏞️|công viên kỷ jura|khủng long
🚢 🧊 💔|titanic
🧙 ⚡ 👓|harry potter
💍 🌋|chúa tể những chiếc nhẫn
🐟 🔍|đi tìm nemo
🤖 ❤️ 🌱|wall e
🐉 🗡️ 👸|dũng sĩ diệt rồng
🧝 🎅|ông già noel
🐰 🥚|thỏ phục sinh
🦢 🩰|hồ thiên nga
🐸 👑 💋|hoàng tử ếch
😴 👸 🌹|người đẹp ngủ trong rừng
🌹 🐻|người đẹp và quái vật
🐺 👴 🐑|chó sói và cừu
🦊 🍇|cáo và chùm nho
🐜 🦗|kiến và ve sầu
`,
  'Đời sống': `
🏫 📚 🎒|đi học|trường học
🌧️ ☂️|trời mưa|mưa
❄️ ⛄|người tuyết
🌈 🌧️ ☀️|cầu vồng
🐓 🌅|gà gáy|gà gáy sáng
💤 🛏️|đi ngủ|ngủ
👵 👴 💕|ông bà
👨‍👩‍👧 📸|ảnh gia đình|chụp ảnh gia đình|hình gia đình
🛒 🥬|đi chợ
🧺 👕 💧|giặt đồ|giặt quần áo
🍳 👩‍🍳|nấu ăn|nấu cơm
🧽 🍽️|rửa chén|rửa bát
🧹 🏠|quét nhà
🌱 💧|tưới cây
🪥 🦷|đánh răng
🛁 🫧|tắm|đi tắm
🚿 💧|tắm vòi sen
💇 ✂️|cắt tóc
💅 💖|làm móng|sơn móng
🏃 🌅|chạy bộ buổi sáng|tập thể dục
🧘 🌿|tập yoga|yoga
📖 🛋️|đọc sách
✍️ 📒|viết nhật ký|viết bài
🎂 🕯️ 🎉|sinh nhật|tiệc sinh nhật
💍 👰 🤵|đám cưới
👶 🍼|em bé
🍼 😴|bé ngủ
🎓 👨‍🎓|tốt nghiệp
🏥 🤒|đi khám bệnh|bệnh viện
💊 🤧|uống thuốc
🌡️ 🤒|bị sốt|sốt
🤧 😷|cảm cúm|bị cảm
🦷 👨‍⚕️|nha sĩ|khám răng
✈️ 🧳 🌍|du lịch|đi du lịch
⛺ 🔥 🌲|cắm trại
🎣 🛶|câu cá|đi câu
🚗 ⛽|đổ xăng
🚦 🚗|đèn giao thông|đèn đỏ
🅿️ 🚗|bãi đỗ xe|bãi giữ xe
🏧 💳|rút tiền|cây atm
📮 ✉️|gửi thư|bưu điện
📞 👵|gọi điện cho bà|gọi điện
📱 🔋|sạc pin|sạc điện thoại
📱 🤳|tự sướng|selfie|chụp hình
💻 ⌨️|đánh máy|máy tính
🎮 🕹️|chơi game
📺 🛋️|xem tivi|xem ti vi
🍿 🎬|xem phim|rạp phim
🎤 🎶 📺|karaoke cùng nhà|hát hò
🎧 🎵|nghe nhạc
🎨 🖌️|vẽ tranh
📸 🌄|chụp ảnh phong cảnh|chụp ảnh
🌳 🧺 🥪|đi dã ngoại|picnic
🏖️ 🌊 🏊|tắm biển
⛰️ 🧗|leo núi
🚲 🌳|đạp xe|đi xe đạp
🛵 🛣️|chạy xe máy|đi xe máy
🛍️ 💳|mua sắm|shopping
🧾 💸|trả tiền|tính tiền
💰 🐷|bỏ ống heo|heo đất|tiết kiệm
⏰ 😫|báo thức|dậy sớm
🥱 🛌|buồn ngủ
😋 🍜|ngon quá|đói bụng
🍽️ 👨‍👩‍👧‍👦|ăn cơm cả nhà|bữa cơm gia đình
☕ 📰|uống cà phê đọc báo|cà phê sáng
🍵 👴|uống trà
🐕 🦮 🚶|dắt chó đi dạo
🐈 🧶|mèo nghịch len
🐠 🫙|bể cá|nuôi cá
🌻 🪴|trồng hoa|chậu hoa
🥬 🌱 🧑‍🌾|trồng rau
🏗️ 🏠|xây nhà
🔑 🏠|chìa khoá nhà|chìa khóa
🚪 🔔|bấm chuông|chuông cửa
📦 🚚|giao hàng
🧳 ✈️|hành lý|vali
🎁 🎀|quà tặng|món quà
💌 ❤️|thư tình|thiệp
🎈 🎉|bóng bay|tiệc
🧩 🧠|xếp hình|ghép hình
♟️ 🧠|chơi cờ|cờ vua
🪁 🌬️|thả diều
🫧 👧|thổi bong bóng
🏊 💦|đi bơi|bơi
👕 🧺|phơi đồ
🍳 🥚 🌅|ăn sáng|bữa sáng
🌙 🍜|ăn tối|bữa tối
`,
  'Con vật': `
🐶|con chó|chó|cún
🐱|con mèo|mèo
🐭|con chuột|chuột
🐹|chuột hamster|hamster
🐰|con thỏ|thỏ
🦊|con cáo|cáo
🐻|con gấu|gấu
🐼|gấu trúc
🐻‍❄️|gấu bắc cực|gấu trắng
🐨|gấu koala|koala
🐯|con hổ|hổ|cọp
🦁|sư tử
🐮|con bò|bò
🐷|con heo|heo|lợn
🐸|con ếch|ếch
🐵|con khỉ|khỉ
🐔|con gà|gà
🐧|chim cánh cụt
🐦|con chim|chim
🐤|gà con
🦆|con vịt|vịt
🦅|đại bàng
🦉|cú mèo|con cú
🦇|con dơi|dơi
🐺|chó sói|sói
🐗|lợn rừng|heo rừng
🐴|con ngựa|ngựa
🦄|kỳ lân
🐝|con ong|ong
🐛|con sâu|sâu
🦋|con bướm|bướm
🐌|ốc sên
🐞|bọ rùa
🐜|con kiến|kiến
🦟|con muỗi|muỗi
🕷️|con nhện|nhện
🦂|bọ cạp
🐢|con rùa|rùa
🐍|con rắn|rắn
🦎|thằn lằn
🦖|khủng long|khủng long bạo chúa
🦕|khủng long cổ dài
🐙|bạch tuộc
🦑|con mực|mực
🦐|con tôm|tôm
🦞|tôm hùm
🦀|con cua|cua
🐡|cá nóc
🐠|cá cảnh|cá nhiệt đới
🐟|con cá|cá
🐬|cá heo
🐳|cá voi
🦈|cá mập
🐊|cá sấu
🐆|báo đốm|con báo
🦓|ngựa vằn
🦍|khỉ đột
🦧|đười ươi
🐘|con voi|voi
🦛|hà mã
🦏|tê giác
🐪|lạc đà
🦒|hươu cao cổ
🦘|chuột túi|kangaroo
🐃|con trâu|trâu
🐏|con cừu|cừu
🐐|con dê|dê
🦌|con hươu|con nai|nai
🐓|gà trống
🦃|gà tây
🦚|con công|chim công
🦜|con vẹt|vẹt
🦢|thiên nga
🦩|hồng hạc
🕊️|chim bồ câu|bồ câu
🐇|thỏ trắng
🦝|gấu mèo
🦨|chồn hôi
🦡|con lửng
🦦|rái cá
🦥|con lười
🐁|chuột nhắt
🐿️|con sóc|sóc
🦔|con nhím|nhím
🐉|con rồng|rồng
🦭|hải cẩu
🐾|dấu chân
🪲|bọ cánh cứng
🪳|con gián|gián
🦗|châu chấu|dế
🐣|gà nở|trứng nở
🐥|gà con lông vàng
🐩|chó xù
🦮|chó dẫn đường
🐈‍⬛|mèo đen
🐕‍🦺|chó nghiệp vụ
🦤|chim dodo
🦬|bò rừng
🦣|voi ma mút
`,
  'Cây & hoa': `
🌹|hoa hồng
🌷|hoa tulip|tulip
🌻|hoa hướng dương
🌼|hoa cúc
🌸|hoa anh đào
🌺|hoa dâm bụt|hoa râm bụt
💐|bó hoa
🥀|hoa héo
🪷|hoa sen|sen
🌵|cây xương rồng|xương rồng
🌴|cây dừa|cây cọ
🌲|cây thông
🌳|cây xanh|cái cây
🎄|cây thông noel
🍀|cỏ bốn lá
☘️|cỏ ba lá
🌿|thảo mộc|rau thơm
🍁|lá phong
🍂|lá rụng|lá vàng
🍃|lá bay|chiếc lá
🌾|bông lúa|lúa
🌱|mầm cây|cây non
🎋|cây tre|tre
🎍|cây trúc|tre trang trí
🍄|cây nấm|nấm
🪴|chậu cây
🪵|khúc gỗ|gỗ
`,
  'Trái cây & rau': `
🍎|quả táo|táo
🍏|táo xanh
🍐|quả lê|lê
🍊|quả cam|cam
🍋|quả chanh|chanh
🍌|quả chuối|chuối
🍉|quả dưa hấu
🍇|chùm nho|nho
🍓|quả dâu|dâu tây
🫐|việt quất
🍈|dưa lưới|dưa gang
🍒|quả anh đào|cherry
🍑|quả đào|đào
🥭|quả xoài|xoài
🍍|quả dứa|dứa|thơm|khóm
🥥|quả dừa|dừa
🥝|quả kiwi|kiwi
🍅|cà chua
🍆|cà tím
🥑|quả bơ|bơ
🥦|bông cải xanh|súp lơ xanh
🥬|cải xanh|rau cải
🥒|dưa leo|dưa chuột
🌶️|ớt|trái ớt
🫑|ớt chuông
🌽|bắp ngô|ngô|bắp
🥕|cà rốt
🧄|tỏi|củ tỏi
🧅|hành tây
🥔|khoai tây
🍠|khoai lang
🥜|đậu phộng|lạc
🌰|hạt dẻ
🫘|hạt đậu|đậu
`,
  'Đồ ăn & uống': `
🍕|bánh pizza|pizza
🍔|bánh hamburger|hamburger
🍟|khoai tây chiên
🌭|xúc xích|hot dog
🍿|bắp rang|bỏng ngô
🍩|bánh donut|bánh vòng
🍪|bánh quy
🎂|bánh sinh nhật|bánh kem
🍰|bánh ngọt|bánh kem dâu
🧁|bánh cupcake|bánh nướng nhỏ
🥧|bánh nướng|bánh pie
🍫|sô cô la|socola
🍬|viên kẹo|kẹo
🍭|kẹo mút
🍮|bánh flan|bánh plan|caramen
🍯|hũ mật ong
🧀|phô mai
🥐|bánh sừng bò|croissant
🥖|bánh mì
🥨|bánh quy xoắn|pretzel
🥞|bánh kếp|pancake
🧇|bánh quế|waffle
🍣|sushi
🍙|cơm nắm
🍘|bánh gạo
🍥|chả cá|chả cá nhật
🥟|sủi cảo|há cảo|bánh bao chiên
🍱|cơm hộp|cơm bento
🍛|cơm cà ri|cà ri
🍝|mì ý|spaghetti
🥗|rau trộn|salad|xà lách trộn
🥪|bánh mì kẹp|sandwich
🌮|bánh taco|taco
🌯|bánh cuốn|burrito
🥙|bánh mì pita
🥘|chảo đồ ăn|nồi lẩu thập cẩm
🍲|nồi canh|canh
🥣|bát cháo|cháo
🍜|tô mì|tô phở
🍦|kem ốc quế|kem
🍧|đá bào|kem đá
🍨|kem ly
🍡|bánh trôi xiên|dango
🥠|bánh may mắn
🥮|bánh trung thu nướng
🍵|tách trà|trà xanh
☕|tách cà phê|cà phê|cafe
🧋|trà sữa|trà sữa trân châu
🥛|ly sữa|sữa
🧃|hộp nước ép|nước hộp
🥤|ly nước ngọt|nước ngọt
🧊|cục đá|đá viên
🥚|quả trứng|trứng
🍳|trứng ốp la|trứng chiên
🥓|thịt xông khói
🥩|miếng thịt|thịt
🍗|đùi gà
🍖|thịt nướng|sườn
🦴|khúc xương|xương
🍚|bát cơm|chén cơm|cơm
🍞|ổ bánh mì sandwich|bánh mì gối
🧈|bơ lạt
🧂|muối|lọ muối
🥫|đồ hộp|hộp thiếc
🫕|nồi lẩu phô mai|fondue
🥡|hộp mì xào|đồ ăn mang về
🫓|bánh tráng|bánh đa
🥯|bánh vòng bagel|bagel
🍤|tôm chiên|tôm tẩm bột
🥧|bánh táo
`,
  'Đồ vật': `
📱|điện thoại
💻|máy tính xách tay|laptop
🖥️|máy tính bàn
⌨️|bàn phím
🖱️|chuột máy tính
🖨️|máy in
📷|máy ảnh|máy chụp hình
📹|máy quay
📺|ti vi|tivi
📻|đài radio|radio
⏰|đồng hồ báo thức
⌚|đồng hồ đeo tay
⏳|đồng hồ cát
🔦|đèn pin
💡|bóng đèn
🕯️|cây nến|nến
🧯|bình cứu hoả|bình chữa cháy
🛢️|thùng dầu
💰|túi tiền
💵|tiền giấy|tờ đô la
🪙|đồng xu|xu
💳|thẻ ngân hàng|thẻ tín dụng
💎|kim cương
⚖️|cái cân|cân
🔧|cờ lê
🔨|cái búa|búa
🪛|tua vít
🪚|cái cưa|cưa
🔩|đinh ốc|bu lông
⚙️|bánh răng
🧲|nam châm
🪜|cái thang|thang
🧰|hộp đồ nghề
🔫|súng nước
💣|quả bom
🔪|con dao|dao
🗡️|thanh kiếm|kiếm
🛡️|tấm khiên|khiên
🔮|quả cầu pha lê
🧿|bùa mắt xanh
💈|cột cắt tóc
🔭|kính thiên văn
🔬|kính hiển vi
💊|viên thuốc|thuốc
💉|ống tiêm|tiêm
🩹|băng cá nhân|urgo
🩺|ống nghe
🌡️|nhiệt kế
🚪|cánh cửa|cửa
🪞|cái gương|gương
🪟|cửa sổ
🛏️|cái giường|giường
🛋️|ghế sô pha|sofa
🪑|cái ghế|ghế
🚽|bồn cầu
🚿|vòi sen
🛁|bồn tắm
🧴|chai kem|chai dầu gội
🧷|kim băng
🧹|cây chổi|chổi
🧺|cái giỏ|giỏ
🧻|giấy vệ sinh
🧼|cục xà phòng|xà phòng|xà bông
🧽|miếng bọt biển|miếng rửa chén
🪣|cái xô|xô
🪥|bàn chải đánh răng|bàn chải
🛒|xe đẩy hàng
🎈|quả bóng bay
🎏|cờ cá chép
🎀|cái nơ|nơ
🎁|hộp quà
🎊|pháo giấy
🎉|pháo tiệc
🎎|búp bê nhật
🏮|lồng đèn đỏ
🪅|piñata|pinata
🧸|gấu bông
🪆|búp bê nga|matryoshka
🖼️|bức tranh|khung ảnh
🧵|cuộn chỉ|chỉ
🪡|cây kim|kim may
🧶|cuộn len|len
👓|mắt kính|kính cận
🕶️|kính râm|kính mát
🥽|kính bơi
🌂|cây dù|dù|ô
☂️|dù mở|cái ô
🎒|ba lô|cặp sách
👜|túi xách
👛|ví tiền|bóp
💼|cặp da|cặp táp
🧳|va li|vali
🔑|chìa khoá|chìa khóa
🗝️|chìa khoá cổ
🔒|ổ khoá|ổ khóa
🔔|cái chuông|chuông
📢|cái loa|loa
📣|loa cầm tay|loa phóng thanh
📯|tù và
🎙️|micro|mic
📚|chồng sách|sách
📖|quyển sách|sách mở
📓|quyển vở|vở
📒|sổ tay
📝|ghi chú|viết ghi chú
✏️|bút chì
🖊️|bút bi
🖍️|bút sáp màu|bút màu
🖌️|cọ vẽ
📏|thước kẻ|thước
📐|thước ê ke|ê ke
✂️|cây kéo|kéo
📎|kẹp giấy
📌|đinh ghim
🗂️|bìa hồ sơ
🗓️|lịch|tờ lịch
📅|cuốn lịch
📦|thùng hàng|hộp giấy
✉️|phong bì|lá thư|thư
📮|hộp thư
🏷️|nhãn mác|tem giá
🗑️|thùng rác
🧮|bàn tính
🪫|pin yếu|hết pin
🔋|cục pin|pin
🔌|phích cắm|ổ cắm
🧭|la bàn
🗺️|bản đồ
🧪|ống nghiệm
⚗️|bình thí nghiệm
🪤|bẫy chuột
🪝|cái móc|móc
⛓️|dây xích|xích
🪢|nút thắt|sợi dây
🎯|bia phi tiêu|phi tiêu
🎲|xúc xắc|cục xí ngầu|xí ngầu
🃏|lá bài|bài joker
🧩|mảnh ghép|ghép hình
🪀|con quay yoyo|yoyo
🪁|con diều|diều
🎮|tay cầm chơi game|máy chơi game
🕹️|cần điều khiển
🎰|máy đánh bạc|máy xèng
🛎️|chuông khách sạn|chuông bàn
🪔|đèn dầu
🏺|bình gốm|chum
⚱️|bình hoa|lọ
🪦|bia mộ
🛞|bánh xe
🧯|bình chữa cháy
🪒|dao cạo
🧤|găng tay|bao tay
🧣|khăn quàng cổ|khăn choàng
🧦|đôi tất|tất|vớ
👒|mũ rộng vành|nón rộng vành
🎩|mũ ảo thuật|mũ chóp cao
🧢|mũ lưỡi trai|nón kết
⛑️|mũ bảo hộ
🪖|mũ quân đội|mũ cối
👑|vương miện
💍|chiếc nhẫn|nhẫn
💄|son môi|thỏi son
👠|giày cao gót
👡|dép sandal|sandal
👢|đôi bốt|bốt
👟|giày thể thao
👞|giày tây
🩴|dép tông|dép lào
🩳|quần đùi|quần short
👖|quần jean|quần bò
👕|áo thun|áo phông
👔|áo sơ mi|cà vạt
👗|đầm|váy đầm
👙|đồ bơi|bikini
🩱|áo bơi một mảnh
👘|áo kimono|kimono
🥻|áo sari
🧥|áo khoác
🥼|áo blouse|áo bác sĩ
🦺|áo phản quang
👚|áo nữ
👛|cái ví nhỏ
`,
  'Phương tiện': `
🚗|xe hơi|ô tô|xe ô tô
🚕|xe taxi|taxi
🚙|xe suv|xe gia đình
🚌|xe buýt|xe bus
🚎|xe điện bánh hơi|xe buýt điện
🏎️|xe đua
🚓|xe cảnh sát|xe công an
🚑|xe cứu thương
🚒|xe cứu hoả|xe chữa cháy
🚐|xe van|xe khách nhỏ
🛻|xe bán tải
🚚|xe tải
🚛|xe container|xe công
🚜|máy cày|xe máy cày
🛵|xe tay ga|xe máy
🏍️|xe mô tô|mô tô
🛺|xe lam|xe tuk tuk
🚲|xe đạp
🛴|xe trượt scooter|xe scooter
🛹|ván trượt
🛼|giày patin|patin
🚂|đầu máy hơi nước|tàu hơi nước
🚆|tàu hoả|tàu hỏa|xe lửa
🚇|tàu điện ngầm
🚊|tàu điện
🚝|tàu một ray
🚄|tàu cao tốc
🚡|cáp treo
🚠|cáp treo núi
✈️|máy bay
🛩️|máy bay nhỏ
🚁|trực thăng
🚀|tên lửa
🛸|đĩa bay
🛶|chiếc xuồng|xuồng|ca nô
⛵|thuyền buồm
🚤|ca nô cao tốc|tàu cao tốc
🛥️|du thuyền
🛳️|tàu du lịch|tàu khách
⛴️|phà|tàu phà
🚢|con tàu|tàu thuỷ
⚓|mỏ neo|neo
🪂|dù lượn|nhảy dù
🎢|tàu lượn siêu tốc|tàu lượn
🎡|vòng đu quay|đu quay
🎠|ngựa gỗ|vòng xoay ngựa gỗ
🛝|cầu trượt
🚏|trạm xe buýt
⛽|cây xăng|trạm xăng
🚥|đèn tín hiệu
🛑|biển dừng|biển stop
🚧|rào chắn|công trường
`,
  'Thiên nhiên': `
☀️|mặt trời
🌙|mặt trăng|trăng khuyết
🌕|trăng tròn
⭐|ngôi sao|sao
🌟|sao sáng
🌠|sao băng
☁️|đám mây|mây
⛅|trời nhiều mây
⛈️|giông bão|mưa giông
🌩️|sấm sét
⚡|tia chớp|sét
🌪️|lốc xoáy|vòi rồng
🌫️|sương mù
🌬️|gió thổi|gió
🌀|cơn bão|bão
🌈|cầu vồng bảy sắc
❄️|bông tuyết|tuyết
☃️|người tuyết có tuyết
🔥|ngọn lửa|lửa
💧|giọt nước
🌊|con sóng|sóng biển|sóng
🌋|núi lửa phun
🏔️|núi tuyết
⛰️|ngọn núi|núi
🏕️|khu cắm trại
🏖️|bãi biển
🏜️|sa mạc
🏝️|hòn đảo|đảo
🏞️|công viên quốc gia
🌅|bình minh|mặt trời mọc
🌄|ánh bình minh trên núi
🌇|hoàng hôn|mặt trời lặn
🌃|đêm thành phố|đêm sao
🌌|dải ngân hà|ngân hà
🌍|trái đất|địa cầu
🪐|sao thổ|hành tinh
☄️|sao chổi
🌑|trăng non
🌡️|nhiệt độ
💨|cơn gió
🪨|hòn đá|đá
🌫️|sương
🧊|tảng băng|băng
`,
  'Thể thao': `
⚽|bóng đá|đá banh|đá bóng
🏀|bóng rổ
🏈|bóng bầu dục
⚾|bóng chày
🥎|bóng mềm
🎾|quần vợt|tennis
🏐|bóng chuyền
🏉|rugby
🏓|bóng bàn
🏸|cầu lông
🏒|khúc côn cầu
🏑|khúc côn cầu trên cỏ
🥍|bóng vợt
🏏|cricket
⛳|đánh golf|golf
🏹|bắn cung
🎣|cần câu
🤿|lặn biển|lặn
🥊|quyền anh|boxing|đấm bốc
🥋|võ thuật|karate|judo
🛷|xe trượt tuyết
⛸️|trượt băng
⛷️|trượt tuyết
🏂|trượt ván tuyết
🏋️|cử tạ|tập tạ
🤼|đấu vật|vật
🤸|nhào lộn|thể dục dụng cụ
🤺|đấu kiếm
🤾|bóng ném
🏌️|chơi golf
🏇|đua ngựa
🧘|ngồi thiền|thiền
🏄|lướt sóng
🏊|bơi lội
🤽|bóng nước
🚣|chèo thuyền
🧗|leo vách đá|leo núi nhân tạo
🚴|đua xe đạp
🚵|xe đạp địa hình
🏆|cúp vô địch|chiếc cúp
🥇|huy chương vàng
🥈|huy chương bạc
🥉|huy chương đồng
🏅|huy chương
🎳|ném bowling|bowling
🥅|khung thành|cầu môn
🛹|trượt ván
🏃|chạy bộ|chạy
🤹|tung hứng|xiếc
🎱|bi a|bida
🪃|boomerang
🥏|đĩa ném|frisbee
`,
  'Nghề nghiệp': `
👨‍🍳|đầu bếp
👮|cảnh sát|công an
👨‍⚕️|bác sĩ
👩‍⚕️|nữ bác sĩ|y tá
👩‍🏫|cô giáo|giáo viên
👨‍🏫|thầy giáo
👨‍🚒|lính cứu hoả|lính cứu hỏa
👨‍🌾|nông dân
👨‍🔧|thợ sửa xe|thợ máy
👨‍🏭|công nhân nhà máy
👨‍💻|lập trình viên|dân it
👨‍💼|nhân viên văn phòng
👨‍🔬|nhà khoa học
👨‍🎨|hoạ sĩ|họa sĩ
👩‍🎤|ca sĩ
👨‍✈️|phi công
👨‍🚀|phi hành gia
👨‍⚖️|thẩm phán|quan toà
👷|công nhân xây dựng|thợ xây
💂|lính gác
🕵️|thám tử
🧑‍⚕️|nhân viên y tế
🧑‍🍼|bảo mẫu
🤵|chú rể
👰|cô dâu
🫅|nhà vua|vua
👸|công chúa
🤴|hoàng tử
🧙|phù thuỷ|phù thủy
🧚|nàng tiên|cô tiên
🧛|ma cà rồng
🧟|xác sống|zombie
🧞|thần đèn
🦸|siêu anh hùng|siêu nhân
🦹|kẻ phản diện
🥷|ninja
🧑‍🎄|ông già nô en|ông già noel
🤶|bà già noel
👼|thiên thần
🤡|chú hề
👻|con ma|ma
💀|đầu lâu
🤖|người máy|robot
👽|người ngoài hành tinh
🧑‍🚒|nhân viên cứu hộ
🧑‍🌾|người làm vườn
🧑‍🔧|thợ điện
🧑‍🏫|người dạy học
🧑‍🎓|sinh viên|học sinh tốt nghiệp
💇|thợ cắt tóc|làm tóc
💆|mát xa|massage
🧑‍✈️|cơ trưởng
🧑‍🎤|rocker
🧑‍🍳|người nấu bếp
`,
  'Âm nhạc': `
🎸|đàn ghi ta|guitar
🎹|đàn piano|piano|dương cầm
🎺|kèn trumpet|kèn
🎷|kèn saxophone|saxophone
🥁|cái trống|trống
🎻|đàn vi ô lông|violin|vĩ cầm
🪕|đàn banjo|banjo
🪗|đàn phong cầm|accordion
🎤|micro hát|hát
🎧|tai nghe
🎼|bản nhạc|khuông nhạc
🎵|nốt nhạc
🎶|giai điệu|bài hát
🪘|trống dài|trống conga
🔔|chuông gió
🎙️|phòng thu
📯|kèn đồng
`,
  'Cảm xúc': `
😂|cười ra nước mắt
😭|khóc to|khóc nức nở
😡|tức giận|giận dữ
🥰|yêu thương|đáng yêu
😍|mê mẩn|si mê
😎|ngầu|sành điệu
🤔|suy nghĩ|thắc mắc
😴|buồn ngủ díp mắt|ngủ gật
🤤|thèm chảy nước miếng|thèm ăn
🤯|nổ não|choáng váng
🥶|lạnh cóng|rét run
🥵|nóng bức|nóng quá
😱|hoảng sợ|sợ hãi
😇|thiên thần nhỏ|ngoan hiền
🤫|giữ bí mật|suỵt
🤐|im lặng|kín miệng
🤑|hám tiền|mê tiền
🤠|cao bồi
🥳|tiệc tùng|ăn mừng
😷|đeo khẩu trang
🤒|ốm sốt|bị ốm
🤕|bị thương
🤮|buồn nôn
🤧|hắt hơi|hắt xì
😜|tinh nghịch|lè lưỡi
🙄|đảo mắt|chán chường
😬|ngại ngùng|nhăn nhó
🥺|năn nỉ|mắt cún con
😤|hậm hực|tức tối
🫡|chào kiểu quân đội|tuân lệnh
🫣|che mắt|ngượng
🫢|ngạc nhiên che miệng|bất ngờ
😵‍💫|chóng mặt
🥱|ngáp|ngáp ngủ
💔|tim vỡ|thất tình|tan vỡ
❤️|trái tim|tim
💯|điểm tuyệt đối|một trăm điểm
👍|tốt lắm|like|thích
👏|vỗ tay
🙏|cầu nguyện|cảm ơn
🤝|bắt tay
✌️|chữ v|hai ngón tay
💪|cơ bắp|mạnh mẽ
👋|vẫy tay|chào
🫶|tay trái tim|bắn tim
`,
  'Kiến trúc': `
🏠|ngôi nhà|nhà
🏡|nhà có vườn
🏘️|khu dân cư|xóm
🏚️|nhà hoang|nhà bỏ hoang
🏢|toà nhà|cao ốc
🏬|trung tâm thương mại|siêu thị lớn
🏣|bưu điện nhật
🏥|bệnh viện
🏦|ngân hàng
🏨|khách sạn
🏪|cửa hàng tiện lợi|tạp hoá
🏫|trường học cấp một|ngôi trường
🏩|nhà nghỉ
🏭|nhà máy|xí nghiệp
🏯|lâu đài nhật|thành cổ
🏰|lâu đài
💒|nhà thờ cưới
🗼|tháp truyền hình|tháp
🗽|tượng nữ thần tự do
⛪|nhà thờ
🕌|thánh đường hồi giáo
🛕|ngôi chùa|chùa|đền
⛩️|cổng đền|cổng torii
⛲|đài phun nước
⛺|lều trại|cái lều
🌁|cầu trong sương
🌉|cây cầu đêm|cây cầu
🎪|rạp xiếc
🏟️|sân vận động
🏛️|bảo tàng|toà nhà cổ
🗿|tượng đá
🧱|viên gạch|gạch
🛖|túp lều|chòi
🏗️|công trình xây dựng|cần cẩu
`,
};

// ---------- Ghép tự động: món ăn ----------
const PROTEIN = [['gà', '🐔'], ['vịt', '🦆'], ['bò', '🐄'], ['heo', '🐷'], ['cá', '🐟'], ['tôm', '🦐'], ['cua', '🦀'], ['mực', '🦑'], ['ốc', '🐌'], ['ếch', '🐸'], ['dê', '🐐'], ['trứng', '🥚'], ['đậu hũ', '🧈'], ['nấm', '🍄'], ['sườn', '🍖']];
const METHOD = [['nướng', '🔥'], ['chiên', '🍳'], ['hấp', '♨️'], ['xào', '🥘'], ['luộc', '🫕']];
const DISH = [['cơm', '🍚'], ['cháo', '🥣'], ['lẩu', '🍲'], ['bún', '🍜'], ['bánh mì', '🥖'], ['mì', '🍝'], ['gỏi', '🥗']];
const SKIP = new Set(['trứng hấp', 'đậu hũ luộc', 'nấm luộc', 'ốc chiên', 'ếch luộc', 'cua chiên', 'trứng xào', 'sườn luộc', 'mực luộc',
  'bánh mì ốc', 'bánh mì ếch', 'bánh mì dê', 'bánh mì cua', 'bánh mì mực', 'bánh mì tôm', 'bánh mì vịt', 'bánh mì nấm', 'bánh mì đậu hũ',
  'cháo trứng', 'cháo sườn', 'lẩu trứng', 'bún trứng', 'gỏi trứng', 'gỏi sườn', 'gỏi đậu hũ', 'gỏi ốc', 'gỏi dê', 'gỏi ếch', 'mì ốc', 'mì ếch', 'mì dê', 'mì đậu hũ', 'mì sườn',
  'cơm ốc', 'cơm ếch', 'cơm cua', 'cơm dê', 'cơm nấm', 'bún dê', 'bún mực', 'bún ếch', 'bún sườn', 'cháo dê', 'cháo nấm', 'lẩu sườn', 'cháo đậu hũ', 'bún đậu hũ']);
// ---------- Ghép tự động: đồ uống / tráng miệng ----------
const FRUIT = [['cam', '🍊'], ['chanh', '🍋'], ['dưa hấu', '🍉'], ['xoài', '🥭'], ['dâu', '🍓'], ['bơ', '🥑'], ['dừa', '🥥'], ['nho', '🍇'], ['táo', '🍎'], ['chuối', '🍌'], ['dứa', '🍍'], ['đào', '🍑'], ['lê', '🍐'], ['kiwi', '🥝'], ['dưa lưới', '🍈'], ['việt quất', '🫐'], ['cà chua', '🍅'], ['cà rốt', '🥕']];
const DRINK = [['nước', '🧃'], ['sinh tố', '🥤'], ['kem', '🍦'], ['bánh', '🍰']];
const SKIP2 = new Set(['kem cà chua', 'kem cà rốt', 'bánh cà chua', 'bánh chanh', 'bánh dưa hấu', 'bánh nho', 'bánh lê', 'bánh kiwi', 'bánh dưa lưới', 'kem lê', 'kem táo', 'kem cam', 'sinh tố chanh', 'bánh đào', 'kem dưa lưới', 'sinh tố cà rốt', 'bánh bơ', 'bánh dứa', 'kem nho']);

function gen() {
  const out = [];
  for (const [cat, txt] of Object.entries(RAW)) {
    txt.trim().split('\n').forEach((line) => {
      const [emoji, ans, ...alts] = line.split('|').map((x) => x.trim());
      if (emoji && ans) out.push([emoji, ans, cat, ...alts]);
    });
  }
  const alt = (a) => {
    const r = [];
    if (a.includes('heo')) r.push(a.replace('heo', 'lợn'));
    if (a.includes('chiên')) r.push(a.replace('chiên', 'rán'));
    if (a.includes('bò')) r.push(a.replace('bò', 'bò viên'));
    if (a.includes('đậu hũ')) r.push(a.replace('đậu hũ', 'đậu phụ'));
    if (a.includes('dứa')) r.push(a.replace('dứa', 'thơm'));
    if (a.startsWith('nước ')) r.push(a.replace('nước ', 'nước ép '));
    if (a.includes('dâu')) r.push(a.replace('dâu', 'dâu tây'));
    return r;
  };
  for (const [p, pe] of PROTEIN) {
    for (const [m, me] of METHOD) { const a = `${p} ${m}`; if (!SKIP.has(a)) out.push([`${pe} ${me}`, a, 'Món ăn', ...alt(a)]); }
    for (const [d, de] of DISH) { const a = `${d} ${p}`; if (!SKIP.has(a)) out.push([`${de} ${pe}`, a, 'Món ăn', ...alt(a)]); }
  }
  for (const [f, fe] of FRUIT) for (const [d, de] of DRINK) { const a = `${d} ${f}`; if (!SKIP2.has(a)) out.push([`${de} ${fe}`, a, 'Đồ uống & tráng miệng', ...alt(a)]); }
  // Bỏ trùng đáp án
  const seen = new Set();
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();
  return out.filter((p) => { const k = norm(p[1]); if (seen.has(k)) return false; seen.add(k); return true; });
}

export const PUZZLES = gen();
