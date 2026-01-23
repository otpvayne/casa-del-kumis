import { diskStorage } from 'multer';
import { extname } from 'path';

export const multerVoucherTmpConfig = {
  storage: diskStorage({
    destination: '/tmp/uploads/vouchers/tmp',
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname || '.jpg');
      const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, name);
    },
  }),
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB (ajusta)
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    if (!file.mimetype?.startsWith('image/')) {
      return cb(new Error('Solo se permiten archivos de imagen'), false);
    }
    cb(null, true);
  },
};
