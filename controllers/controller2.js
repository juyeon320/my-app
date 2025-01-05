import Memo from '../models/memo.js'; // Sequelize Memo 모델
import Comment from '../models/Comment.js'; // Sequelize Comment 모델
import dayjs from 'dayjs'; // 날짜 포맷팅 라이브러리

// 메모 추가하기
const addMemo = async (req, res) => {
  try {
    const file = req.file;
    if (!req.session.user) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const memoData = {
      title: req.body.title,
      context: req.body.context,
      time: dayjs().format('YYYY-MM-DD HH:mm:ss'), // 포맷된 시간
      username: req.session.user.nickname,
      img: file ? `/uploads/${file.filename}` : null,
      like: 0,
      view: 0,
      comments: 0,
    };

    const newMemo = await Memo.create(memoData);
    res.redirect('/memo_list');
  } catch (err) {
    console.error('게시물 저장 중 오류 발생:', err);
    res.status(500).json({ error: '게시물을 저장하는 데 실패했습니다.' });
  }
};

// 메모 목록 조회
const getMemoList = async (req, res) => {
  try {
    const memos = await Memo.findAll({
      order: [['time', 'DESC']],
      include: [Comment], // 댓글 포함
    });
    console.log(memos); // 반환되는 데이터 확인

    // time 필드 포맷 적용
    const formattedMemos = memos.map((memo) => ({
      ...memo.toJSON(),
      time: dayjs(memo.time).format('YYYY-MM-DD HH:mm:ss'), // 포맷 적용
    }));

    res.status(200).json(formattedMemos);
  } catch (err) {
    console.error('메모 목록 조회 중 오류 발생:', err);
    res.status(500).json({ error: '메모 데이터를 가져오는 데 실패했습니다.' });
  }
};

// 메모 상세 조회
const look_selected_memo = async (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: '유효한 게시물 ID가 필요합니다.' });
  }

  try {
    const memo = await Memo.findOne({
      where: { id },
      include: [
        {
          model: Comment,
          attributes: ['id', 'text', 'username', 'createdAt'],
          order: [['createdAt', 'DESC']], // 최신 댓글 먼저
        },
      ],
    });

    if (!memo) {
      return res.status(404).json({ error: '게시물을 찾을 수 없습니다.' });
    }
//댓글 수 계산
    const commentCount = memo.Comments ? memo.Comments.length : 0;

    const formattedMemo = {
      ...memo.toJSON(), // Sequelize 모델을 JSON 객체로 변환
      comments: memo.Comments || [], // 댓글 데이터 포함
      commentCount,
      time: dayjs(memo.time).format('YYYY-MM-DD HH:mm:ss'), // 포맷 적용
    };


    res.status(200).json(formattedMemo);
  } catch (err) {
    console.error('메모 상세보기 중 오류 발생:', err);
    res.status(500).json({ error: '메모 데이터를 가져오는 데 실패했습니다.' });
  }
};

// Sequelize Memo 모델 주석추가

// 게시물 수정 데이터 로드 및 작성자 확인
const getMemoForEdit = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: '게시물 ID가 필요합니다.' });
    }

    // 댓글은 제외하고 게시물 데이터만 가져오기
    const memo = await Memo.findOne({
      where: { id: Number(id) },
      attributes: ['id', 'title', 'context', 'time', 'username', 'img'], // 필요한 필드만 가져옴
    });

    if (!memo) {
      return res.status(404).json({ error: '해당 게시물을 찾을 수 없습니다.' });
    }

    res.status(200).json({ memo });
  } catch (err) {
    console.error('게시물 불러오기 중 오류 발생:', err);
    res.status(500).json({ error: '게시물을 불러오는 데 실패했습니다.' });
  }
};




// 메모 수정
const updateMemo = async (req, res) => {
  try {
    const { id, title, context } = req.body;

    console.log('req.body:', req.body); // 요청 데이터
    console.log('req.file:', req.file); // 업로드된 파일 정보


    if (!id) {
      return res.status(400).json({ error: '게시물 ID가 필요합니다.' });
    }

    const memo = await Memo.findOne({ where: { id: Number(id) } });
    if (!memo) {
      return res.status(404).json({ error: '수정하려는 게시물을 찾을 수 없습니다.' });
    }

    // 작성자 확인
    if (memo.username !== req.session.user.nickname) {
      return res.status(403).json({ error: '수정 권한이 없습니다.' });
    }

    // 업데이트할 필드만 조건적으로 설정
    const updatedFields = { title, context };
      if (req.file) {
         updatedFields.img = `/uploads/${req.file.filename}`;
      }

    await memo.update({ ...updatedFields, time: new Date() });
    res.status(200).json({ message: '게시물이 성공적으로 수정되었습니다.', memo });
  } catch (err) {
    console.error('게시물 수정 중 오류 발생:', err);
    res.status(500).json({ error: '게시물을 수정하는 데 실패했습니다.' });
  }
};

// 메모 삭제
const delete_memo = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: '게시물 ID가 필요합니다.' });
    }

    const memo = await Memo.findOne({ where: { id: Number(id) } });

    if (!memo) {
      return res.status(404).json({ error: '메모를 찾을 수 없습니다.' });
    }

    // 작성자 확인
    if (memo.username !== req.session.user.nickname) {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }

    await memo.destroy();
    res.status(200).json({ message: '게시물이 성공적으로 삭제되었습니다.' });
  } catch (err) {
    console.error('메모 삭제 중 오류 발생:', err);
    res.status(500).json({ error: '메모 삭제에 실패했습니다.' });
  }
};

export { getMemoForEdit, addMemo, getMemoList, look_selected_memo, updateMemo, delete_memo };
