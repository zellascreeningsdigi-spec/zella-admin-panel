import { useState, useEffect, useCallback } from 'react';
import { Search, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

const PAGE_SIZE = 10;

const vendorStatusBadge = (status?: string) => {
  const map: Record<string, string> = {
    not_started: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-800',
    verified: 'bg-green-100 text-green-800',
    disputed: 'bg-red-100 text-red-800',
  };
  const labels: Record<string, string> = {
    not_started: 'Not Started',
    in_progress: 'In Progress',
    verified: 'Verified',
    disputed: 'Disputed',
  };
  const s = status || 'not_started';
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[s]}`}>{labels[s] || s}</span>;
};

// Cases for the logged-in vendor (admin: all their vendor's cases; member: only
// assigned). Vendor-admins can assign a case to a team member here.
const VendorCasesTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isVendorAdmin = user?.role === 'vendor';

  const [verifications, setVerifications] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchVerifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getAddressVerifications({
        search,
        page: currentPage,
        limit: PAGE_SIZE,
      });
      if (response.success && response.data) {
        setVerifications(response.data.verifications || []);
        setTotalCount(response.data.pagination?.total ?? 0);
      }
    } catch (error) {
      console.error('Failed to fetch assigned cases:', error);
      alert('Failed to load your cases. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, currentPage]);

  const fetchMembers = useCallback(async () => {
    if (!isVendorAdmin) return;
    try {
      const res = await apiService.getVendorMembers();
      if (res.success && res.data) setMembers(res.data.members.filter((m: any) => m.isActive));
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  }, [isVendorAdmin]);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAssign = async (verificationId: string, memberId: string) => {
    if (!memberId) return;
    try {
      const res = await apiService.assignCaseMember(verificationId, memberId);
      if (res.success) {
        fetchVerifications();
      } else {
        alert(res.message || 'Failed to assign');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to assign');
    }
  };

  const pageCount = Math.ceil(totalCount / PAGE_SIZE);

  // Assigned-To control: dropdown for vendor-admins, plain name for members.
  const renderAssign = (v: any) =>
    isVendorAdmin ? (
      <select
        className="px-2 py-1 border border-gray-300 rounded-md text-sm w-full sm:w-auto"
        value={v.vendorWork?.assignedMember?._id || ''}
        onChange={(e) => handleAssign(v._id, e.target.value)}
      >
        <option value="">— Unassigned —</option>
        {members.map((m) => (
          <option key={m._id} value={m._id}>{m.name}</option>
        ))}
      </select>
    ) : (
      <span className="text-sm">{v.vendorWork?.assignedMember?.name || '—'}</span>
    );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold">My Cases</h2>
        <p className="text-sm sm:text-base text-gray-500">
          {isVendorAdmin
            ? 'Address verification cases assigned to your team. Assign each to a member, then open to verify.'
            : 'Address verification cases assigned to you. Open a case to complete the verification.'}
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Search by name, code, or company"
          value={search}
          onChange={(e) => {
            setCurrentPage(1);
            setSearch(e.target.value);
          }}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>
      ) : verifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-lg font-medium text-gray-500">No cases found</div>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="rounded-md border hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Vendor Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verifications.map((v) => (
                  <TableRow key={v._id}>
                    <TableCell className="font-mono text-sm">{v.code}</TableCell>
                    <TableCell>
                      <div className="font-medium">{v.name}</div>
                      <div className="text-sm text-gray-500">{v.email}</div>
                    </TableCell>
                    <TableCell>{v.companyName}</TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={v.address}>{v.address}</div>
                    </TableCell>
                    <TableCell>{vendorStatusBadge(v.vendorWork?.status)}</TableCell>
                    <TableCell>{renderAssign(v)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/vendor/cases/${v._id}`)}
                        title="Open case"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {verifications.map((v) => (
              <div key={v._id} className="border rounded-md p-3 space-y-2 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{v.name}</div>
                    <div className="text-xs text-gray-500">{v.email}</div>
                  </div>
                  <span className="font-mono text-xs text-gray-500 whitespace-nowrap">{v.code}</span>
                </div>
                <div className="text-sm"><span className="text-gray-500">Company:</span> {v.companyName}</div>
                <div className="text-sm"><span className="text-gray-500">Address:</span> {v.address}</div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Status:</span> {vendorStatusBadge(v.vendorWork?.status)}
                </div>
                <div className="text-sm">
                  <span className="text-gray-500 block mb-1">Assigned To:</span>
                  {renderAssign(v)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(`/vendor/cases/${v._id}`)}
                >
                  <Eye className="w-4 h-4 mr-2" /> Open Case
                </Button>
              </div>
            ))}
          </div>
        </>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))} disabled={currentPage >= pageCount}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorCasesTab;
