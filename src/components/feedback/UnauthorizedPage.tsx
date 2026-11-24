import React from 'react';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_DEFAULT_ROUTES, ROUTES } from '../../app/config/navigation';
import { Button } from '../ui/Button';
import { Badge } from '../common/Badge';

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const homePath = currentUser
    ? ROLE_DEFAULT_ROUTES[currentUser.role]
    : ROUTES.LOGIN;

  return (
    <div className="min-h-screen bg-subtle flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg border border-border p-8 text-center space-y-5">
        <div className="mx-auto w-11 h-11 rounded-md bg-white border border-red-300 text-red-600 flex items-center justify-center">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="space-y-2">
          <Badge variant="danger">403 • Access restricted</Badge>
          <h1 className="text-lg font-semibold text-primary pt-1">
            Unauthorized access
          </h1>
          <p className="text-sm text-secondary">
            Your active session{' '}
            {currentUser ? (
              <strong className="text-primary font-medium capitalize">
                ({currentUser.role})
              </strong>
            ) : null}{' '}
            does not have permission to view this section.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Go back
          </Button>
          <Button
            type="button"
            onClick={() => navigate(homePath, { replace: true })}
            leftIcon={<Home className="w-4 h-4" />}
          >
            My dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
