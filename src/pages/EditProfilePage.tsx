import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Save, X, Upload, AlertCircle, CheckCircle, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../context/AuthContext';
import { NotificationContext } from '../App';

interface ProfileFormData {
  username: string;
  specialization: string;
  aiToolsUsed: string[];
  avatarUrl: string;
}

const PREDEFINED_SPECIALIZATIONS = [
  'Frontend Development',
  'Backend Development',
  'Full Stack Development',
  'Mobile Development',
  'AI/ML Engineering',
  'Data Science',
  'DevOps Engineering',
  'UI/UX Design',
  'Game Development',
  'Blockchain Development',
  'Cybersecurity',
  'Cloud Architecture',
  'Product Management',
  'Technical Writing'
];

const PREDEFINED_AI_TOOLS = [
  'GitHub Copilot',
  'ChatGPT',
  'Claude',
  'Cursor',
  'v0.dev',
  'Bolt.new',
  'Midjourney',
  'DALL-E',
  'Stable Diffusion',
  'Vercel AI SDK',
  'OpenAI API',
  'Anthropic API',
  'Google Bard',
  'Tabnine',
  'CodeWhisperer',
  'Replit AI',
  'Codeium',
  'Amazon Q',
  'JetBrains AI'
];

export const EditProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const notifications = React.useContext(NotificationContext);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentAiTool, setCurrentAiTool] = React.useState('');
  
  // Avatar upload states
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string>('');
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  
  const [formData, setFormData] = React.useState<ProfileFormData>({
    username: '',
    specialization: '',
    aiToolsUsed: [],
    avatarUrl: ''
  });

  // Store original data to detect changes
  const [originalUsername, setOriginalUsername] = React.useState<string>('');
  const [originalAvatarUrl, setOriginalAvatarUrl] = React.useState<string>('');

  // Fetch current profile data
  React.useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          setError('Failed to load profile data');
          return;
        }

        if (data) {
          const profileData = {
            username: data.username || '',
            specialization: data.specialization || '',
            aiToolsUsed: data.ai_tools_used || [],
            avatarUrl: data.avatar_url || ''
          };
          
          setFormData(profileData);
          setOriginalUsername(data.username || '');
          setOriginalAvatarUrl(data.avatar_url || '');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, navigate]);

  const validateForm = (): boolean => {
    if (!formData.username.trim()) {
      setError('Username is required');
      return false;
    }

    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }

    if (formData.username.length > 20) {
      setError('Username must be 20 characters or less');
      return false;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      setError('Username can only contain letters, numbers, underscores, and hyphens');
      return false;
    }

    if (formData.aiToolsUsed.length > 10) {
      setError('Maximum 10 AI tools allowed');
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setError(null);
  };

  const handleAvatarUpload = async () => {
    if (!selectedFile || !user) return;

    try {
      setUploadingAvatar(true);
      setError(null);

      // Generate unique file path
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        setError('Failed to upload image. Please try again.');
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!urlData.publicUrl) {
        setError('Failed to get image URL');
        return;
      }

      console.log('DEBUG: Avatar upload successful, public URL:', urlData.publicUrl);

      // Update form data with new avatar URL
      setFormData(prev => ({ ...prev, avatarUrl: urlData.publicUrl }));
      
      // Clear file selection
      setSelectedFile(null);
      setAvatarPreview('');
      
      if (notifications) {
        notifications.showSuccess(
          'Avatar Uploaded',
          'Your profile picture has been uploaded successfully'
        );
      }

    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = () => {
    setFormData(prev => ({ ...prev, avatarUrl: '' }));
    setSelectedFile(null);
    setAvatarPreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to update your profile');
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Check if username is already taken (excluding current user)
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', formData.username.trim())
        .neq('id', user.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is what we want
        console.error('Error checking username:', checkError);
        setError('Failed to validate username');
        return;
      }

      if (existingUser) {
        setError('Username is already taken');
        return;
      }

      // Check what has changed
      const usernameChanged = formData.username.trim() !== originalUsername;
      const avatarChanged = formData.avatarUrl.trim() !== originalAvatarUrl;

      console.log('DEBUG: Before updating profile, formData.avatarUrl:', formData.avatarUrl);

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: formData.username.trim(),
          specialization: formData.specialization.trim() || null,
          ai_tools_used: formData.aiToolsUsed,
          avatar_url: formData.avatarUrl.trim() || null
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        setError('Failed to update profile');
        return;
      }

      // Always update user metadata if username or avatar changed
      if (usernameChanged || avatarChanged) {
        try {
          console.log('DEBUG: Updating auth metadata with avatar_url:', formData.avatarUrl.trim() || null);
          
          const { error: authUpdateError } = await supabase.auth.updateUser({
            data: {
              username: formData.username.trim(),
              avatar_url: formData.avatarUrl.trim() || null
            }
          });

          if (authUpdateError) {
            console.error('Error updating auth metadata:', authUpdateError);
            // Don't fail the entire operation if metadata update fails
            console.warn('Profile updated but auth metadata update failed');
          } else {
            console.log('Successfully updated auth metadata');
          }
        } catch (authError) {
          console.error('Unexpected error updating auth metadata:', authError);
          // Continue with success since profile was updated
        }
      }

      if (notifications) {
        notifications.showSuccess(
          'Profile Updated',
          'Your profile has been updated successfully'
        );
      }
      
      // Redirect to profile page after a short delay
      setTimeout(() => {
        navigate(`/profile/${formData.username}`);
      }, 1500);

    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
      if (notifications) {
        notifications.showError(
          'Update Failed',
          'Failed to update your profile. Please try again.'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const addAiTool = (tool: string) => {
    const trimmedTool = tool.trim();
    if (!trimmedTool) return;

    if (formData.aiToolsUsed.includes(trimmedTool)) {
      setError(`${trimmedTool} is already added`);
      return;
    }

    if (formData.aiToolsUsed.length >= 10) {
      setError('Maximum 10 AI tools allowed');
      return;
    }

    setFormData(prev => ({
      ...prev,
      aiToolsUsed: [...prev.aiToolsUsed, trimmedTool]
    }));
    setCurrentAiTool('');
    setError(null);
  };

  const removeAiTool = (tool: string) => {
    setFormData(prev => ({
      ...prev,
      aiToolsUsed: prev.aiToolsUsed.filter(t => t !== tool)
    }));
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white border border-gray-300 rounded-lg">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-2">
            <User className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
          </div>
          <p className="text-gray-600">
            Update your profile information and preferences.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your_username"
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_-]+"
            />
            <p className="text-xs text-gray-500 mt-1">
              3-20 characters, letters, numbers, underscores, and hyphens only
            </p>
            {formData.username !== originalUsername && (
              <p className="text-xs text-blue-600 mt-1">
                ⚠️ Changing your username will update your profile URL
              </p>
            )}
          </div>

          {/* Avatar Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profile Picture <span className="text-gray-400">(optional)</span>
            </label>
            
            {/* Current Avatar or Preview */}
            <div className="flex items-start space-x-4 mb-4">
              <div className="flex-shrink-0">
                {(avatarPreview || formData.avatarUrl) ? (
                  <img
                    src={avatarPreview || formData.avatarUrl}
                    alt="Avatar preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {formData.username.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                {/* File Input */}
                <div className="mb-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Upload an image (max 5MB). Supported formats: JPG, PNG, GIF, WebP
                  </p>
                </div>

                {/* Upload Button */}
                {selectedFile && (
                  <button
                    type="button"
                    onClick={handleAvatarUpload}
                    disabled={uploadingAvatar}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white text-sm rounded-lg transition-colors"
                  >
                    {uploadingAvatar ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>Upload Image</span>
                      </>
                    )}
                  </button>
                )}

                {/* Remove Avatar Button */}
                {(formData.avatarUrl || avatarPreview) && !selectedFile && (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Remove Image</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Specialization */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specialization <span className="text-gray-400">(optional)</span>
            </label>
            
            {/* Predefined Specializations */}
            <div className="mb-3">
              <p className="text-xs text-gray-600 mb-2">Select your primary area:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {PREDEFINED_SPECIALIZATIONS.map((spec) => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, specialization: spec }))}
                    className={`p-2 text-sm border rounded transition-colors text-left ${
                      formData.specialization === spec
                        ? 'bg-blue-50 border-blue-200 text-blue-800'
                        : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Specialization Input */}
            <input
              type="text"
              value={formData.specialization}
              onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Or enter custom specialization"
              maxLength={50}
            />
            <p className="text-xs text-gray-500 mt-1">
              What type of development do you focus on?
            </p>
          </div>

          {/* AI Tools Used */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Tools Used <span className="text-gray-400">(optional)</span>
            </label>
            
            {/* Predefined AI Tools */}
            <div className="mb-3">
              <p className="text-xs text-gray-600 mb-2">Select tools you use:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                {PREDEFINED_AI_TOOLS.map((tool) => (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => addAiTool(tool)}
                    disabled={formData.aiToolsUsed.includes(tool)}
                    className={`p-2 text-sm border rounded transition-colors text-left ${
                      formData.aiToolsUsed.includes(tool)
                        ? 'bg-purple-50 border-purple-200 text-purple-800 cursor-not-allowed'
                        : 'border-gray-300 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    {tool}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom AI Tool Input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={currentAiTool}
                onChange={(e) => setCurrentAiTool(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAiTool(currentAiTool))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add custom AI tool"
                maxLength={30}
              />
              <button
                type="button"
                onClick={() => addAiTool(currentAiTool)}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                Add
              </button>
            </div>

            {/* Selected AI Tools */}
            <div className="flex flex-wrap gap-2">
              {formData.aiToolsUsed.map((tool) => (
                <span
                  key={tool}
                  className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                >
                  {tool}
                  <button
                    type="button"
                    onClick={() => removeAiTool(tool)}
                    className="ml-2 text-purple-500 hover:text-red-500 transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formData.aiToolsUsed.length}/10 AI tools
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={saving || uploadingAvatar}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingAvatar}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};