import { Edit, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface Vendor {
  _id: string;
  name: string;
  email: string;
  companyName?: string;
  phone?: string;
  description?: string;
  gstin?: string;
  addressVerificationPrice: number;
  isActive: boolean;
  type?: 'independent' | 'company';
  createdAt?: string;
  locations?: string[];
}

interface VendorsTableProps {
  vendors: Vendor[];
  loading: boolean;
  onEdit: (vendor: Vendor) => void;
  onDeactivate: (vendor: Vendor) => void;
}

const VendorsTable = ({ vendors, loading, onEdit, onDeactivate }: VendorsTableProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">Loading vendors...</div>
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
        <div className="text-lg font-medium text-gray-500">No vendors found</div>
        <div className="text-sm text-gray-400 mt-2">Click "Add Vendor" to create one</div>
      </div>
    );
  }

  const statusBadge = (isActive: boolean) => (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );

  return (
    <>
      {/* Desktop table */}
      <div className="rounded-md border hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Locations</TableHead>
              <TableHead>GSTIN</TableHead>
              <TableHead>Price / Case (₹)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((vendor) => (
              <TableRow key={vendor._id}>
                <TableCell>
                  <div className="font-medium">{vendor.name}</div>
                  {vendor.description && (
                    <div className="text-sm text-gray-500 max-w-xs truncate" title={vendor.description}>
                      {vendor.description}
                    </div>
                  )}
                </TableCell>
                <TableCell>{vendor.companyName || '-'}</TableCell>
                <TableCell className="capitalize">{vendor.type || 'independent'}</TableCell>
                <TableCell>
                  <div className="text-sm">{vendor.email}</div>
                  {vendor.phone && <div className="text-xs text-gray-500">{vendor.phone}</div>}
                </TableCell>
                <TableCell className="max-w-[160px]">
                  {vendor.locations && vendor.locations.length > 0 ? (
                    <span className="text-sm truncate block" title={vendor.locations.join(', ')}>
                      {vendor.locations.join(', ')}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm">{vendor.gstin || '-'}</TableCell>
                <TableCell>{vendor.addressVerificationPrice}</TableCell>
                <TableCell>{statusBadge(vendor.isActive)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(vendor)} title="Edit">
                      <Edit className="w-4 h-4" />
                    </Button>
                    {vendor.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeactivate(vendor)}
                        title="Deactivate"
                      >
                        <Ban className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {vendors.map((vendor) => (
          <div key={vendor._id} className="border rounded-md p-3 space-y-2 bg-white">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium">{vendor.name}</div>
                {vendor.description && (
                  <div className="text-sm text-gray-500">{vendor.description}</div>
                )}
              </div>
              {statusBadge(vendor.isActive)}
            </div>
            <div className="text-sm"><span className="text-gray-500">Company:</span> {vendor.companyName || '-'}</div>
            <div className="text-sm"><span className="text-gray-500">Type:</span> <span className="capitalize">{vendor.type || 'independent'}</span></div>
            <div className="text-sm break-all"><span className="text-gray-500">Email:</span> {vendor.email}</div>
            {vendor.phone && <div className="text-sm"><span className="text-gray-500">Phone:</span> {vendor.phone}</div>}
            {vendor.locations && vendor.locations.length > 0 && (
              <div className="text-sm"><span className="text-gray-500">Locations:</span> {vendor.locations.join(', ')}</div>
            )}
            <div className="text-sm"><span className="text-gray-500">GSTIN:</span> {vendor.gstin || '-'}</div>
            <div className="text-sm"><span className="text-gray-500">Price / Case (₹):</span> {vendor.addressVerificationPrice}</div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(vendor)}>
                <Edit className="w-4 h-4 mr-2" /> Edit
              </Button>
              {vendor.isActive && (
                <Button variant="outline" size="sm" className="flex-1 text-red-600" onClick={() => onDeactivate(vendor)}>
                  <Ban className="w-4 h-4 mr-2" /> Deactivate
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default VendorsTable;
