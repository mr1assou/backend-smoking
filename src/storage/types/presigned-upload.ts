export type PresignedUpload = {
  uploadUrl: string;
  imageUrl: string;
  key: string;
  expiresIn: number;
};
