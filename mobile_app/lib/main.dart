import 'package:flutter/widgets.dart';

import 'app.dart';
import 'core/security/mobile_attestation.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await MobileAttestation.initialize();
  } on Object {
    // Guest/local features still launch if native Firebase is unavailable.
  }
  runApp(const MathSolverApp());
}
