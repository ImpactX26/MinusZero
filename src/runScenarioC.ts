import { runInvestigationPipeline } from './investigation/pipeline';

import { auth } from './firebase/config';
import { signInAnonymously } from 'firebase/auth';

async function main() {
  console.log("Running Investigation Pipeline for Scenario C: high_risk_c1003");
  try {
    await signInAnonymously(auth);
    console.log("Authenticated anonymously.");
    const result = await runInvestigationPipeline('high_risk_c1003');
    console.log("Investigation completed successfully!");
    console.log("Result Case ID:", result.case_id);
    console.log("Risk Level:", result.level);
    console.log("Decision:", result.decision);
    console.log("Summary:", result.summary?.verdict);
    console.log("Evidence Found:", result.evidence.length);
    process.exit(0);
  } catch (err) {
    console.error("Error running pipeline:", err);
    process.exit(1);
  }
}

main();
