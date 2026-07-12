import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';
import 'package:palette_generator/palette_generator.dart';

import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../auth/presentation/bloc/auth_event.dart';
import '../../../auth/presentation/bloc/auth_state.dart';

class TenantOnboardingScreen extends StatefulWidget {
  const TenantOnboardingScreen({super.key});

  @override
  State<TenantOnboardingScreen> createState() => _TenantOnboardingScreenState();
}

class _TenantOnboardingScreenState extends State<TenantOnboardingScreen> {
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _companyNameController = TextEditingController();
  final _industryController = TextEditingController();
  final _legalNameController = TextEditingController();
  final _addressController = TextEditingController();
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();
  final _postalCodeController = TextEditingController();
  final _countryController = TextEditingController();
  final _billingEmailController = TextEditingController();
  final _themeColorController = TextEditingController(text: '#6366F1');

  File? _logoFile;
  String? _logoBase64;

  final ImagePicker _picker = ImagePicker();

  final _formKey = GlobalKey<FormState>();

  Future<void> _pickLogo() async {
    try {
      final XFile? pickedFile = await _picker.pickImage(source: ImageSource.gallery);
      if (pickedFile != null) {
        setState(() {
          _logoFile = File(pickedFile.path);
        });
        
        // Convert to base64
        final bytes = await _logoFile!.readAsBytes();
        _logoBase64 = 'data:image/png;base64,${base64Encode(bytes)}';

        // Extract palette
        _extractColorFromLogo(bytes);
      }
    } catch (e) {
      debugPrint('Error picking image: $e');
    }
  }

  Future<void> _extractColorFromLogo(List<int> bytes) async {
    try {
      final imageProvider = MemoryImage(Uint8List.fromList(bytes));
      final paletteGenerator = await PaletteGenerator.fromImageProvider(
        imageProvider,
        maximumColorCount: 20,
      );

      final dominantColor = paletteGenerator.dominantColor?.color;
      if (dominantColor != null) {
        // Convert Color to Hex String
        final hexString = '#${dominantColor.toARGB32().toRadixString(16).substring(2, 8).toUpperCase()}';
        setState(() {
          _themeColorController.text = hexString;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Theme color auto-detected: $hexString')),
          );
        }
      }
    } catch (e) {
      debugPrint('Error extracting color: $e');
    }
  }

  void _onCompleteProfile() {
    if (!_formKey.currentState!.validate()) {
      return; // Validation failed
    }
    
    context.read<AuthBloc>().add(
      OnboardTenantRequested(
        companyName: _companyNameController.text,
        firstName: _firstNameController.text,
        lastName: _lastNameController.text,
        phone: _phoneController.text,
        industry: _industryController.text,
        legalName: _legalNameController.text,
        address: _addressController.text,
        city: _cityController.text,
        state: _stateController.text,
        themeColor: _themeColorController.text,
        logoBase64: _logoBase64,
        postalCode: _postalCodeController.text,
        country: _countryController.text,
        billingEmail: _billingEmailController.text,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0F172A), Color(0xFF1E1B4B)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      'Complete Your Workspace',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Just a few more details to get started',
                      style: TextStyle(color: Colors.white70),
                    ),
                    const SizedBox(height: 32),
                    
                    // Logo Picker
                    GestureDetector(
                      onTap: _pickLogo,
                      child: CircleAvatar(
                        radius: 50,
                        backgroundColor: Colors.white.withValues(alpha: 0.1),
                        backgroundImage: _logoFile != null ? FileImage(_logoFile!) : null,
                        child: _logoFile == null
                            ? const Icon(Icons.add_a_photo, size: 40, color: Colors.white70)
                            : null,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text('Upload Company Logo', style: TextStyle(color: Colors.white70, fontSize: 12)),
                    const SizedBox(height: 24),
                    
                    _buildTextField(
                      controller: _companyNameController,
                      label: 'Display Company Name',
                      icon: Icons.business,
                      isRequired: true,
                    ),
                    const SizedBox(height: 16),
                    _buildTextField(
                      controller: _legalNameController,
                      label: 'Legal Company Name',
                      icon: Icons.account_balance,
                      isRequired: false,
                    ),
                    const SizedBox(height: 16),
                    _buildTextField(
                      controller: _industryController,
                      label: 'Industry',
                      icon: Icons.work,
                      isRequired: true,
                    ),
                    const SizedBox(height: 16),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: _buildTextField(
                            controller: _firstNameController,
                            label: 'First Name',
                            icon: Icons.person,
                            isRequired: true,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: _buildTextField(
                            controller: _lastNameController,
                            label: 'Last Name',
                            icon: Icons.person_outline,
                            isRequired: true,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: _buildTextField(
                            controller: _phoneController,
                            label: 'Mobile Number',
                            icon: Icons.phone,
                            isRequired: true,
                            isPhone: true,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: _buildTextField(
                            controller: _billingEmailController,
                            label: 'Billing Email',
                            icon: Icons.email,
                            isRequired: true,
                            isEmail: true,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _buildTextField(
                      controller: _addressController,
                      label: 'Company Address',
                      icon: Icons.location_on,
                      isRequired: true,
                    ),
                    const SizedBox(height: 16),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: _buildTextField(
                            controller: _cityController,
                            label: 'City',
                            icon: Icons.location_city,
                            isRequired: true,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: _buildTextField(
                            controller: _stateController,
                            label: 'State',
                            icon: Icons.map,
                            isRequired: true,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: _buildTextField(
                            controller: _postalCodeController,
                            label: 'Postal/ZIP Code',
                            icon: Icons.markunread_mailbox,
                            isRequired: true,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: _buildTextField(
                            controller: _countryController,
                            label: 'Country',
                            icon: Icons.public,
                            isRequired: true,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _buildTextField(
                      controller: _themeColorController,
                      label: 'Theme Color (Hex)',
                      icon: Icons.color_lens,
                      isRequired: false,
                    ),
                    const SizedBox(height: 32),
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: BlocConsumer<AuthBloc, AuthState>(
                        listener: (context, state) {
                          if (state is AuthError) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(state.message)),
                            );
                          }
                        },
                        builder: (context, state) {
                          final isLoading = state is AuthLoading;
                          return ElevatedButton(
                            onPressed: isLoading ? null : _onCompleteProfile,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF6366F1),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: isLoading 
                              ? const CircularProgressIndicator(color: Colors.white)
                              : const Text(
                                'Complete Setup',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                          );
                        }
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    bool isRequired = false,
    bool isEmail = false,
    bool isPhone = false,
  }) {
    return TextFormField(
      controller: controller,
      style: const TextStyle(color: Colors.white),
      keyboardType: isEmail ? TextInputType.emailAddress : (isPhone ? TextInputType.phone : TextInputType.text),
      validator: (value) {
        if (isRequired && (value == null || value.trim().isEmpty)) {
          return 'This field is required';
        }
        if (isEmail && value != null && value.isNotEmpty) {
          final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
          if (!emailRegex.hasMatch(value)) {
            return 'Enter a valid email';
          }
        }
        if (isPhone && value != null && value.isNotEmpty) {
          final phoneRegex = RegExp(r'^\+?[0-9]{7,15}$');
          if (!phoneRegex.hasMatch(value.replaceAll(RegExp(r'\s+|-|\(|\)'), ''))) {
            return 'Enter a valid phone number';
          }
        }
        return null;
      },
      decoration: InputDecoration(
        labelText: isRequired ? '$label *' : label,
        labelStyle: TextStyle(color: Colors.white.withValues(alpha: 0.6)),
        prefixIcon: Icon(icon, color: Colors.white.withValues(alpha: 0.6)),
        errorStyle: const TextStyle(color: Colors.redAccent),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.2)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF6366F1)),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.redAccent),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.redAccent, width: 2),
        ),
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.05),
      ),
    );
  }
}
