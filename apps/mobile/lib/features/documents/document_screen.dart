import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/theme.dart';
import '../../../core/widgets/offline_aware_scaffold.dart';
import '../../../core/widgets/app_states.dart';

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT MANAGEMENT SCREEN  (AUDIT §20 — Missing Screens)
// ─────────────────────────────────────────────────────────────────────────────
//
// Covers 3 sub-flows:
//   • DocumentListScreen  — Browse / filter / search documents
//   • DocumentUploadSheet — Modal bottom sheet for upload
//   • DocumentViewerSheet — Preview sheet for PDFs and images
//
// Features:
//   • Category filter tabs (All | My Docs | Company | Shared)
//   • Search bar with debounce
//   • File type icons (PDF, Image, Word, Excel, Generic)
//   • Upload: drag-to-pick OR camera, with upload progress
//   • Preview: PDF thumbnail placeholder, image display, download CTA
//   • Offline notice: show cached docs, mark as unavailable if not cached

// ── Document model ─────────────────────────────────────────────────────────

enum DocCategory { my, company, shared }

extension DocCategoryX on DocCategory {
  String get label => switch (this) {
        DocCategory.my => 'My Docs',
        DocCategory.company => 'Company',
        DocCategory.shared => 'Shared',
      };
}

enum DocFileType { pdf, image, word, excel, generic }

extension DocFileTypeX on DocFileType {
  IconData get icon => switch (this) {
        DocFileType.pdf => Icons.picture_as_pdf_rounded,
        DocFileType.image => Icons.image_rounded,
        DocFileType.word => Icons.description_rounded,
        DocFileType.excel => Icons.grid_on_rounded,
        DocFileType.generic => Icons.insert_drive_file_rounded,
      };

  Color get color => switch (this) {
        DocFileType.pdf => const Color(0xFFBF360C),
        DocFileType.image => const Color(0xFF1565C0),
        DocFileType.word => const Color(0xFF1565C0),
        DocFileType.excel => const Color(0xFF2E7D32),
        DocFileType.generic => const Color(0xFF455A64),
      };

  String get ext => switch (this) {
        DocFileType.pdf => 'PDF',
        DocFileType.image => 'Image',
        DocFileType.word => 'DOCX',
        DocFileType.excel => 'XLSX',
        DocFileType.generic => 'File',
      };
}

class DocumentItem {
  final String id;
  final String name;
  final DocFileType type;
  final DocCategory category;
  final String size;         // e.g. "2.4 MB"
  final DateTime uploadedAt;
  final String uploadedBy;
  final bool isCached;
  final String? thumbnailUrl;

  const DocumentItem({
    required this.id,
    required this.name,
    required this.type,
    required this.category,
    required this.size,
    required this.uploadedAt,
    required this.uploadedBy,
    this.isCached = false,
    this.thumbnailUrl,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT LIST SCREEN
// ─────────────────────────────────────────────────────────────────────────────

class DocumentListScreen extends ConsumerStatefulWidget {
  const DocumentListScreen({super.key});

  @override
  ConsumerState<DocumentListScreen> createState() =>
      _DocumentListScreenState();
}

class _DocumentListScreenState extends ConsumerState<DocumentListScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabCtrl;
  final _searchCtrl = TextEditingController();
  bool _isSearching = false;
  String _query = '';

  // Stub data
  static final _docs = [
    DocumentItem(
      id: '1',
      name: 'Employee Handbook 2026.pdf',
      type: DocFileType.pdf,
      category: DocCategory.company,
      size: '3.2 MB',
      uploadedAt: DateTime(2026, 1, 15),
      uploadedBy: 'HR Admin',
      isCached: true,
    ),
    DocumentItem(
      id: '2',
      name: 'Attendance Policy.docx',
      type: DocFileType.word,
      category: DocCategory.company,
      size: '540 KB',
      uploadedAt: DateTime(2026, 2, 10),
      uploadedBy: 'HR Admin',
    ),
    DocumentItem(
      id: '3',
      name: 'Site Visit Photo - Tower A.jpg',
      type: DocFileType.image,
      category: DocCategory.my,
      size: '1.8 MB',
      uploadedAt: DateTime(2026, 7, 10),
      uploadedBy: 'Me',
      isCached: true,
    ),
    DocumentItem(
      id: '4',
      name: 'Q2 KPI Report.xlsx',
      type: DocFileType.excel,
      category: DocCategory.shared,
      size: '890 KB',
      uploadedAt: DateTime(2026, 7, 1),
      uploadedBy: 'Manager',
    ),
    DocumentItem(
      id: '5',
      name: 'Leave Application Form.pdf',
      type: DocFileType.pdf,
      category: DocCategory.my,
      size: '210 KB',
      uploadedAt: DateTime(2026, 6, 20),
      uploadedBy: 'Me',
      isCached: true,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 4, vsync: this);
    _tabCtrl.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  List<DocumentItem> get _filtered {
    final category = switch (_tabCtrl.index) {
      1 => DocCategory.my,
      2 => DocCategory.company,
      3 => DocCategory.shared,
      _ => null,
    };
    return _docs.where((d) {
      final matchCat = category == null || d.category == category;
      final matchQuery =
          _query.isEmpty || d.name.toLowerCase().contains(_query.toLowerCase());
      return matchCat && matchQuery;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return OfflineAwareScaffold(
      appBar: AppBar(
        title: _isSearching
            ? TextField(
                controller: _searchCtrl,
                autofocus: true,
                decoration: const InputDecoration(
                  hintText: 'Search documents…',
                  border: InputBorder.none,
                ),
                onChanged: (v) => setState(() => _query = v),
              )
            : const Text('Documents'),
        actions: [
          IconButton(
            icon: Icon(_isSearching ? Icons.close : Icons.search_rounded),
            onPressed: () => setState(() {
              _isSearching = !_isSearching;
              if (!_isSearching) {
                _searchCtrl.clear();
                _query = '';
              }
            }),
          ),
          IconButton(
            icon: const Icon(Icons.upload_file_rounded),
            onPressed: () => _showUploadSheet(context),
            tooltip: 'Upload Document',
          ),
        ],
        bottom: TabBar(
          controller: _tabCtrl,
          isScrollable: true,
          tabs: const [
            Tab(text: 'All'),
            Tab(text: 'My Docs'),
            Tab(text: 'Company'),
            Tab(text: 'Shared'),
          ],
        ),
      ),
      body: _filtered.isEmpty
          ? const AppEmptyState(
              type: AppEmptyStateType.noData,
              customTitle: 'No documents found',
              customSubtitle: 'Upload your first document using the button above.',
            )
          : ListView.separated(
              padding: AppSpacing.screenPaddingAll,
              itemCount: _filtered.length,
              separatorBuilder: (_, _) =>
                  const SizedBox(height: AppSpacing.cardMargin),
              itemBuilder: (_, i) => _DocumentCard(
                doc: _filtered[i],
                onTap: () => _showPreview(context, _filtered[i]),
              ),
            ),
    );
  }

  void _showUploadSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const _UploadSheet(),
    );
  }

  void _showPreview(BuildContext context, DocumentItem doc) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _PreviewSheet(doc: doc),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT CARD
// ─────────────────────────────────────────────────────────────────────────────

class _DocumentCard extends StatelessWidget {
  const _DocumentCard({required this.doc, required this.onTap});
  final DocumentItem doc;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.space4,
          vertical: AppSpacing.space2,
        ),
        leading: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: doc.type.color.withValues(alpha: 0.12),
            borderRadius: AppRadius.mdAll,
          ),
          child: Icon(doc.type.icon, color: doc.type.color),
        ),
        title: Text(
          doc.name,
          style: AppTypography.bodyMedium.copyWith(
            fontWeight: FontWeight.w500,
          ),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: doc.type.color.withValues(alpha: 0.10),
                  borderRadius: AppRadius.pillAll,
                ),
                child: Text(
                  doc.type.ext,
                  style: AppTypography.labelSmall.copyWith(
                      color: doc.type.color),
                ),
              ),
              const SizedBox(width: 6),
              Text(doc.size,
                  style: AppTypography.labelSmall.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  )),
              const Spacer(),
              if (!doc.isCached)
                Icon(
                  Icons.cloud_outlined,
                  size: 14,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                )
              else
                Icon(
                  Icons.offline_pin_rounded,
                  size: 14,
                  color: PingForceColors.statusSuccess,
                ),
            ],
          ),
        ),
        trailing: const Icon(Icons.chevron_right_rounded),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD SHEET
// ─────────────────────────────────────────────────────────────────────────────

class _UploadSheet extends StatefulWidget {
  const _UploadSheet();

  @override
  State<_UploadSheet> createState() => _UploadSheetState();
}

class _UploadSheetState extends State<_UploadSheet> {
  String? _fileName;
  double? _progress;   // null = not started, 0.0-1.0 = uploading, 1.0 = done
  DocCategory _category = DocCategory.my;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        24,
        16,
        24,
        MediaQuery.viewInsetsOf(context).bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.outlineVariant,
                borderRadius: AppRadius.pillAll,
              ),
            ),
          ),

          const SizedBox(height: AppSpacing.space4),

          Text('Upload Document',
              style: AppTypography.titleLarge),

          const SizedBox(height: AppSpacing.space4),

          // Category selector
          SegmentedButton<DocCategory>(
            segments: DocCategory.values
                .map((c) => ButtonSegment(
                      value: c,
                      label: Text(c.label),
                    ))
                .toList(),
            selected: {_category},
            onSelectionChanged: (s) => setState(() => _category = s.first),
          ),

          const SizedBox(height: AppSpacing.space4),

          // Drop zone / pick area
          GestureDetector(
            onTap: _pickFile,
            child: Container(
              height: 120,
              decoration: BoxDecoration(
                borderRadius: AppRadius.lgAll,
                border: Border.all(
                  color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.5),
                  width: 1.5,
                  style: BorderStyle.none,  // dashed — use CustomPaint in prod
                ),
                color: Theme.of(context)
                    .colorScheme
                    .primaryContainer
                    .withValues(alpha: 0.3),
              ),
              child: _fileName != null
                  ? Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.insert_drive_file_rounded,
                            color: Theme.of(context).colorScheme.primary,
                            size: 32),
                        const SizedBox(height: 8),
                        Text(_fileName!,
                            style: AppTypography.bodyMedium.copyWith(
                              color:
                                  Theme.of(context).colorScheme.onSurface,
                            )),
                      ],
                    )
                  : Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.cloud_upload_rounded,
                            color: Theme.of(context).colorScheme.primary,
                            size: 32),
                        const SizedBox(height: 8),
                        Text('Tap to choose a file',
                            style: AppTypography.bodyMedium.copyWith(
                              color: Theme.of(context).colorScheme.primary,
                            )),
                        Text('PDF, Image, Word, Excel',
                            style: AppTypography.labelSmall.copyWith(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurfaceVariant,
                            )),
                      ],
                    ),
            ),
          ),

          // Camera option
          const SizedBox(height: AppSpacing.space2),
          TextButton.icon(
            onPressed: _takePhoto,
            icon: const Icon(Icons.camera_alt_outlined),
            label: const Text('Take a Photo Instead'),
          ),

          // Progress
          if (_progress != null) ...[
            const SizedBox(height: AppSpacing.space3),
            ClipRRect(
              borderRadius: AppRadius.pillAll,
              child: LinearProgressIndicator(
                value: _progress,
                minHeight: 6,
                backgroundColor:
                    Theme.of(context).colorScheme.surfaceContainerHigh,
                color: _progress == 1.0
                    ? PingForceColors.statusSuccess
                    : Theme.of(context).colorScheme.primary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              _progress == 1.0
                  ? 'Upload complete!'
                  : 'Uploading ${(_progress! * 100).toInt()}%…',
              style: AppTypography.labelSmall.copyWith(
                color: _progress == 1.0
                    ? PingForceColors.statusSuccess
                    : Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],

          const SizedBox(height: AppSpacing.space4),

          SizedBox(
            height: 52,
            child: FilledButton.icon(
              onPressed:
                  _fileName == null || (_progress != null && _progress! < 1.0)
                      ? null
                      : _progress == 1.0
                          ? () => Navigator.pop(context)
                          : _upload,
              icon: Icon(
                _progress == 1.0
                    ? Icons.check_rounded
                    : Icons.upload_rounded,
              ),
              label: Text(
                _progress == 1.0 ? 'Done' : 'Upload',
              ),
            ),
          ),

          const SizedBox(height: AppSpacing.space2),
        ],
      ),
    );
  }

  void _pickFile() {
    // TODO: file_picker plugin
    setState(() => _fileName = 'document_example.pdf');
  }

  void _takePhoto() {
    // TODO: image_picker with ImageSource.camera
    setState(() => _fileName = 'photo_${DateTime.now().millisecondsSinceEpoch}.jpg');
  }

  Future<void> _upload() async {
    setState(() => _progress = 0.0);
    // Simulate upload
    for (double p = 0.1; p <= 1.0; p += 0.1) {
      await Future<void>.delayed(const Duration(milliseconds: 150));
      if (!mounted) return;
      setState(() => _progress = p.clamp(0.0, 1.0));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW SHEET
// ─────────────────────────────────────────────────────────────────────────────

class _PreviewSheet extends StatelessWidget {
  const _PreviewSheet({required this.doc});
  final DocumentItem doc;

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.75,
      maxChildSize: 0.95,
      builder: (_, scrollCtrl) => Container(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: CustomScrollView(
          controller: scrollCtrl,
          slivers: [
            // Handle + header
            SliverToBoxAdapter(
              child: Padding(
                padding: AppSpacing.screenPaddingAll,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.outlineVariant,
                          borderRadius: AppRadius.pillAll,
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.space4),
                    Row(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: doc.type.color.withValues(alpha: 0.12),
                            borderRadius: AppRadius.mdAll,
                          ),
                          child: Icon(doc.type.icon, color: doc.type.color),
                        ),
                        const SizedBox(width: AppSpacing.space3),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(doc.name,
                                  style: AppTypography.titleSmall,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis),
                              Text(
                                '${doc.type.ext} · ${doc.size}',
                                style: AppTypography.labelSmall.copyWith(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurfaceVariant,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // Preview area
            SliverToBoxAdapter(
              child: Container(
                height: 280,
                margin: AppSpacing.screenPaddingH,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerLow,
                  borderRadius: AppRadius.lgAll,
                  border: Border.all(
                    color: Theme.of(context).colorScheme.outlineVariant,
                  ),
                ),
                child: doc.type == DocFileType.image
                    ? ClipRRect(
                        borderRadius: AppRadius.lgAll,
                        child: doc.thumbnailUrl != null
                            ? Image.network(doc.thumbnailUrl!,
                                fit: BoxFit.cover)
                            : _PlaceholderPreview(
                                icon: Icons.image_rounded,
                                label: 'Image Preview'),
                      )
                    : _PlaceholderPreview(
                        icon: doc.type.icon,
                        label: '${doc.type.ext} Preview',
                      ),
              ),
            ),

            // Meta info + actions
            SliverToBoxAdapter(
              child: Padding(
                padding: AppSpacing.screenPaddingAll,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: AppSpacing.space4),
                    _MetaRow(
                        label: 'Uploaded by', value: doc.uploadedBy),
                    _MetaRow(
                        label: 'Date',
                        value:
                            '${doc.uploadedAt.day}/${doc.uploadedAt.month}/${doc.uploadedAt.year}'),
                    _MetaRow(label: 'Category', value: doc.category.label),
                    _MetaRow(label: 'Cached offline',
                        value: doc.isCached ? 'Yes' : 'No'),
                    const SizedBox(height: AppSpacing.space5),
                    FilledButton.icon(
                      onPressed: () {
                        // TODO: dio download to local path
                      },
                      icon: const Icon(Icons.download_rounded),
                      label: const Text('Download'),
                    ),
                    const SizedBox(height: AppSpacing.space2),
                    OutlinedButton.icon(
                      onPressed: () {
                        // TODO: Share via share_plus
                      },
                      icon: const Icon(Icons.share_rounded),
                      label: const Text('Share'),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PlaceholderPreview extends StatelessWidget {
  const _PlaceholderPreview({required this.icon, required this.label});
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 48,
              color: Theme.of(context).colorScheme.onSurfaceVariant),
          const SizedBox(height: 8),
          Text(label,
              style: AppTypography.bodySmall.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              )),
        ],
      ),
    );
  }
}

class _MetaRow extends StatelessWidget {
  const _MetaRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          SizedBox(
            width: 120,
            child: Text(label,
                style: AppTypography.labelSmall.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                )),
          ),
          Expanded(
            child: Text(value, style: AppTypography.bodySmall),
          ),
        ],
      ),
    );
  }
}
