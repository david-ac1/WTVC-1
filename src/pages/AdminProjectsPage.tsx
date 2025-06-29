import React from 'react';
import { 
  FileText, 
  Search, 
  Star, 
  Pin, 
  Eye, 
  Calendar,
  User,
  TrendingUp,
  Loader2,
  CheckCircle,
  X
} from 'lucide-react';
import { adminService, ModerationProject } from '../lib/admin';

export const AdminProjectsPage: React.FC = () => {
  const [projects, setProjects] = React.useState<ModerationProject[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [moderating, setModerating] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await adminService.getModerationProjects(100, 0);
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureProject = async (project: ModerationProject) => {
    try {
      setModerating(project.id);
      await adminService.moderateProject(project.id, {
        isFeatured: !project.is_featured
      });
      
      // Update local state
      setProjects(prev => prev.map(p => 
        p.id === project.id 
          ? { ...p, is_featured: !p.is_featured }
          : p
      ));
    } catch (error) {
      console.error('Error featuring project:', error);
    } finally {
      setModerating(null);
    }
  };

  const handlePinProject = async (project: ModerationProject) => {
    try {
      setModerating(project.id);
      await adminService.moderateProject(project.id, {
        isPinned: !project.is_pinned
      });
      
      // Update local state
      setProjects(prev => prev.map(p => 
        p.id === project.id 
          ? { ...p, is_pinned: !p.is_pinned }
          : p
      ));
    } catch (error) {
      console.error('Error pinning project:', error);
    } finally {
      setModerating(null);
    }
  };

  const handleVerifyProject = async (project: ModerationProject) => {
    try {
      setModerating(project.id);
      // Note: This would need to be implemented in the backend
      // For now, we'll just update the local state
      setProjects(prev => prev.map(p => 
        p.id === project.id 
          ? { ...p, is_verified: !p.is_verified }
          : p
      ));
    } catch (error) {
      console.error('Error verifying project:', error);
    } finally {
      setModerating(null);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.submitter.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <FileText className="h-8 w-8 text-green-500" />
          <h1 className="text-3xl font-bold text-gray-900">Project Management</h1>
        </div>
        <p className="text-gray-600">
          Feature, pin, verify, and moderate projects
        </p>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-300 rounded-lg p-6 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by title or author..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stats
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProjects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 line-clamp-1">
                        {project.title}
                      </div>
                      <div className="text-sm text-gray-500 line-clamp-2 mt-1">
                        {project.description}
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {formatDate(project.submitted_at)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {project.submitter.username.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {project.submitter.username}
                        </div>
                        {project.submitter.is_banned && (
                          <span className="text-xs text-red-600">Banned</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="font-medium">{project.upvotes}</div>
                          <div className="text-xs text-gray-500">Upvotes</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{project.comment_count}</div>
                          <div className="text-xs text-gray-500">Comments</div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      {project.is_featured && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </span>
                      )}
                      {project.is_pinned && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          <Pin className="h-3 w-3 mr-1" />
                          Pinned
                        </span>
                      )}
                      {project.is_verified && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleFeatureProject(project)}
                        disabled={moderating === project.id}
                        className={`p-1 rounded transition-colors ${
                          project.is_featured
                            ? 'text-yellow-600 hover:text-yellow-800'
                            : 'text-gray-400 hover:text-yellow-600'
                        } disabled:opacity-50`}
                        title={project.is_featured ? 'Unfeature' : 'Feature'}
                      >
                        <Star className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handlePinProject(project)}
                        disabled={moderating === project.id}
                        className={`p-1 rounded transition-colors ${
                          project.is_pinned
                            ? 'text-blue-600 hover:text-blue-800'
                            : 'text-gray-400 hover:text-blue-600'
                        } disabled:opacity-50`}
                        title={project.is_pinned ? 'Unpin' : 'Pin'}
                      >
                        <Pin className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleVerifyProject(project)}
                        disabled={moderating === project.id}
                        className={`p-1 rounded transition-colors ${
                          project.is_verified
                            ? 'text-green-600 hover:text-green-800'
                            : 'text-gray-400 hover:text-green-600'
                        } disabled:opacity-50`}
                        title={project.is_verified ? 'Unverify' : 'Verify'}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <a
                        href={`/project/${project.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
                        title="View Project"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Found</h3>
            <p className="text-gray-600">
              {searchQuery ? 'No projects match your search criteria.' : 'No projects to display.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};