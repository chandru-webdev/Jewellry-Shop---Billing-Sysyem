import apiClient from './client'

// Single place for multipart uploads. Always builds a fresh FormData and lets
// the browser set the multipart Content-Type (with boundary) — never pass a
// JSON Content-Type for binary bodies, axios will stringify the FormData.
export const uploadApi = {
  uploadMedia: (file, { onUploadProgress } = {}) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post('/upload/media', formData, {
      onUploadProgress,
    })
  },
}

export default uploadApi