import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Ban,
  CheckCircle2,
  AlertCircle,
  X,
  Tag,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
} from 'lucide-react';
import { categoryApi } from '../api/categoryApi';
import { Category, CategoryType, CreateCategoryRequest, UpdateCategoryRequest } from '../types';
import { useDialog } from '../context/DialogContext';

export const CategoryManager: React.FC = () => {
  const { confirm, alert } = useDialog();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Multi-select State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('EXPENSE');
  const [description, setDescription] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await categoryApi.getAllCategories();
      setCategories(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Multi-select handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === categories.length && categories.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(categories.map((c) => c.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    const isConfirmed = await confirm({
      title: `Delete ${count} Categor${count > 1 ? 'ies' : 'y'}`,
      message: `Are you sure you want to permanently delete ${count} selected categor${count > 1 ? 'ies' : 'y'}? This action cannot be undone.\n\nNote: Categories with existing transactions will be safely preserved.`,
      confirmText: `Delete ${count} Categor${count > 1 ? 'ies' : 'y'}`,
      cancelText: 'Cancel',
      variant: 'danger',
      customIcon: <Trash2 size={22} />,
    });
    if (!isConfirmed) return;

    setBulkLoading(true);
    setFeedbackMessage(null);

    try {
      const res = await categoryApi.bulkDeleteCategories(Array.from(selectedIds));
      setSelectedIds(new Set());
      await fetchCategories();

      if (res.deletedCount > 0 && res.failedCount === 0) {
        setFeedbackMessage({
          type: 'success',
          text: `Successfully deleted ${res.deletedCount} categor${res.deletedCount > 1 ? 'ies' : 'y'}: ${res.deletedNames.join(', ')}.`,
        });
      } else if (res.deletedCount > 0 && res.failedCount > 0) {
        setFeedbackMessage({
          type: 'warning',
          text: `Deleted ${res.deletedCount} categor${res.deletedCount > 1 ? 'ies' : 'y'} (${res.deletedNames.join(', ')}). However, ${res.failedCount} could not be deleted: ${res.failedReasons.join('; ')}`,
        });
      } else if (res.failedCount > 0) {
        setFeedbackMessage({
          type: 'error',
          text: `Could not delete categories: ${res.failedReasons.join('; ')}`,
        });
      }
    } catch (err: unknown) {
      setFeedbackMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Bulk deletion failed',
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setType('EXPENSE');
    setDescription('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setType(cat.type);
    setDescription(cat.description || '');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setModalError('Category name is required');
      return;
    }

    setModalLoading(true);
    setModalError(null);
    try {
      if (editingCategory) {
        const updateReq: UpdateCategoryRequest = {
          name: name.trim(),
          type,
          description: description.trim() || undefined,
          isActive: editingCategory.isActive,
        };
        await categoryApi.updateCategory(editingCategory.id, updateReq);
      } else {
        const createReq: CreateCategoryRequest = {
          name: name.trim(),
          type,
          description: description.trim() || undefined,
        };
        await categoryApi.createCategory(createReq);
      }
      setIsModalOpen(false);
      await fetchCategories();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeactivate = async (id: string, catName: string) => {
    const isConfirmed = await confirm({
      title: 'Deactivate Category',
      message: `Are you sure you want to deactivate the category "${catName}"? It will no longer be available for new transactions.`,
      confirmText: 'Deactivate',
      cancelText: 'Cancel',
      variant: 'warning',
      customIcon: <Ban size={22} />,
    });
    if (!isConfirmed) {
      return;
    }
    try {
      await categoryApi.deactivateCategory(id);
      await fetchCategories();
    } catch (err: unknown) {
      await alert({
        title: 'Deactivation Failed',
        message: err instanceof Error ? err.message : 'Failed to deactivate category',
        variant: 'danger',
      });
    }
  };

  const handleDelete = async (id: string, catName: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Category',
      message: `Are you sure you want to permanently delete the category "${catName}"? This action cannot be undone.`,
      confirmText: 'Delete Category',
      cancelText: 'Keep Category',
      variant: 'danger',
      customIcon: <Trash2 size={22} />,
    });
    if (!isConfirmed) {
      return;
    }
    try {
      await categoryApi.deleteCategory(id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await fetchCategories();
    } catch (err: unknown) {
      await alert({
        title: 'Deletion Failed',
        message: err instanceof Error ? err.message : 'Failed to delete category',
        variant: 'danger',
      });
    }
  };

  const allSelected = categories.length > 0 && selectedIds.size === categories.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Tag size={22} style={{ color: 'var(--accent-primary)' }} />
            Category Master Management
          </h2>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            Admin-only management of club income and expense categories
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            Add Category
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor:
              feedbackMessage.type === 'success'
                ? 'rgba(16, 185, 129, 0.15)'
                : feedbackMessage.type === 'warning'
                ? 'rgba(245, 158, 11, 0.15)'
                : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${
              feedbackMessage.type === 'success'
                ? 'rgba(16, 185, 129, 0.3)'
                : feedbackMessage.type === 'warning'
                ? 'rgba(245, 158, 11, 0.3)'
                : 'rgba(239, 68, 68, 0.3)'
            }`,
            borderRadius: 'var(--radius-md)',
            color:
              feedbackMessage.type === 'success'
                ? 'var(--color-income)'
                : feedbackMessage.type === 'warning'
                ? 'var(--color-pending)'
                : 'var(--color-expense)',
            fontSize: 'var(--font-size-sm)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 size={16} />
            ) : feedbackMessage.type === 'warning' ? (
              <AlertTriangle size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            style={{ color: 'inherit', padding: '0.2rem', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#f87171',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          {error}
        </div>
      )}

      {/* Multi-select Action Bar */}
      {selectedIds.size > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem 1.25rem',
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--accent-primary)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            flexWrap: 'wrap',
            gap: '0.75rem',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              className="badge badge-info"
              style={{ padding: '0.2rem 0.5rem', fontSize: 'var(--font-size-xs)' }}
            >
              {selectedIds.size} Selected
            </span>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
              of {categories.length} total categories
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              className="btn btn-outline"
              style={{ fontSize: 'var(--font-size-xs)', padding: '0.35rem 0.75rem' }}
              onClick={handleClearSelection}
              disabled={bulkLoading}
            >
              Clear Selection
            </button>

            <button
              className="btn"
              style={{
                backgroundColor: 'var(--color-expense)',
                color: '#ffffff',
                fontSize: 'var(--font-size-xs)',
                padding: '0.35rem 0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
              onClick={handleBulkDelete}
              disabled={bulkLoading}
            >
              <Trash2 size={14} className={bulkLoading ? 'spin' : ''} />
              {bulkLoading ? 'Deleting...' : `Delete Selected (${selectedIds.size})`}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Loading categories...
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  {/* Multiselect Checkbox Header */}
                  <th style={{ width: '48px', textAlign: 'center' }}>
                    <div
                      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                      onClick={handleSelectAll}
                      title={allSelected ? 'Deselect All' : 'Select All'}
                    >
                      {allSelected ? (
                        <CheckSquare size={18} style={{ color: 'var(--accent-primary)' }} />
                      ) : (
                        <Square size={18} style={{ color: 'var(--text-secondary)' }} />
                      )}
                    </div>
                  </th>
                  <th>Category Name</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No categories found. Click "Add Category" to create one.
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => {
                    const isSelected = selectedIds.has(cat.id);
                    return (
                      <tr
                        key={cat.id}
                        style={{
                          opacity: cat.isActive ? 1 : 0.6,
                          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.08)' : undefined,
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        {/* Checkbox Column */}
                        <td style={{ width: '48px', textAlign: 'center' }}>
                          <div
                            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                            onClick={() => handleToggleSelect(cat.id)}
                            title={isSelected ? 'Deselect' : 'Select'}
                          >
                            {isSelected ? (
                              <CheckSquare size={18} style={{ color: 'var(--accent-primary)' }} />
                            ) : (
                              <Square size={18} style={{ color: 'var(--text-secondary)' }} />
                            )}
                          </div>
                        </td>

                        <td style={{ fontWeight: 600 }}>{cat.name}</td>
                        <td>
                          <span
                            className={`badge ${
                              cat.type === 'INCOME'
                                ? 'badge-success'
                                : cat.type === 'EXPENSE'
                                ? 'badge-danger'
                                : 'badge-info'
                            }`}
                          >
                            {cat.type}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                          {cat.description || '—'}
                        </td>
                        <td>
                          {cat.isActive ? (
                            <span className="badge badge-success" style={{ textTransform: 'capitalize' }}>
                              <CheckCircle2 size={12} /> Active
                            </span>
                          ) : (
                            <span className="badge" style={{ backgroundColor: 'rgba(107, 114, 128, 0.2)', color: 'var(--text-muted)' }}>
                              Inactive
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-outline"
                              style={{ padding: '0.35rem 0.6rem' }}
                              title="Edit Category"
                              onClick={() => openEditModal(cat)}
                            >
                              <Edit2 size={14} />
                            </button>
                            {cat.isActive && (
                              <button
                                className="btn btn-outline"
                                style={{ padding: '0.35rem 0.6rem', color: '#f59e0b' }}
                                title="Deactivate Category"
                                onClick={() => handleDeactivate(cat.id, cat.name)}
                              >
                                <Ban size={14} />
                              </button>
                            )}
                            <button
                              className="btn btn-outline"
                              style={{ padding: '0.35rem 0.6rem', color: '#f87171' }}
                              title="Delete Category"
                              onClick={() => handleDelete(cat.id, cat.name)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Category Create/Edit Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '500px',
              backgroundColor: 'var(--bg-surface)',
              padding: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ color: 'var(--text-secondary)', padding: '0.25rem' }}
              >
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: '#f87171',
                  fontSize: 'var(--font-size-xs)',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={14} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Category Name *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Tournament Equipment"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Category Type *
                </label>
                <select
                  className="form-input"
                  value={type}
                  onChange={(e) => setType(e.target.value as CategoryType)}
                >
                  <option value="EXPENSE">EXPENSE (Outflow only)</option>
                  <option value="INCOME">INCOME (Inflow only)</option>
                  <option value="BOTH">BOTH (Bi-directional)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Description
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Optional description of typical expenses in this category..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: editingCategory ? 'space-between' : 'flex-end', alignItems: 'center', marginTop: '0.5rem' }}>
                {editingCategory && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    onClick={async () => {
                      const isConfirmed = await confirm({
                        title: 'Delete Category',
                        message: `Are you sure you want to permanently delete the category "${editingCategory.name}"? This action cannot be undone.`,
                        confirmText: 'Delete Category',
                        cancelText: 'Cancel',
                        variant: 'danger',
                        customIcon: <Trash2 size={22} />,
                      });
                      if (isConfirmed) {
                        setModalLoading(true);
                        try {
                          await categoryApi.deleteCategory(editingCategory.id);
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            next.delete(editingCategory.id);
                            return next;
                          });
                          setIsModalOpen(false);
                          await fetchCategories();
                        } catch (err: unknown) {
                          setModalError(err instanceof Error ? err.message : 'Failed to delete category');
                        } finally {
                          setModalLoading(false);
                        }
                      }
                    }}
                    disabled={modalLoading}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setIsModalOpen(false)}
                    disabled={modalLoading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={modalLoading}>
                    {modalLoading ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
