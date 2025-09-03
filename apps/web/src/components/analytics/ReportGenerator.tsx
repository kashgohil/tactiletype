import React, { useState } from 'react';
import type { AnalyticsOverview, ProgressChart } from '@tactile/types';

interface ReportGeneratorProps {
  overview: AnalyticsOverview;
  progressCharts: ProgressChart[];
  onExportData: (format: 'csv' | 'json') => void;
}

interface ReportData {
  period: 'week' | 'month' | 'quarter' | 'year';
  includeCharts: boolean;
  includeDetailedStats: boolean;
  includeRecommendations: boolean;
  format: 'pdf' | 'html' | 'json';
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  overview,
  progressCharts,
  onExportData,
}) => {
  const [reportData, setReportData] = useState<ReportData>({
    period: 'month',
    includeCharts: true,
    includeDetailedStats: true,
    includeRecommendations: true,
    format: 'pdf',
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      // TODO: Implement actual report generation
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate generation
      
      // For now, just export the data
      onExportData('json');
      
      console.log('Report generated with settings:', reportData);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getReportPreview = () => {
    const currentDate = new Date();
    const periodMap = {
      week: 'Weekly',
      month: 'Monthly',
      quarter: 'Quarterly',
      year: 'Annual',
    };

    return {
      title: `${periodMap[reportData.period]} Typing Performance Report`,
      date: currentDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      sections: [
        'Executive Summary',
        'Performance Overview',
        ...(reportData.includeCharts ? ['Progress Charts', 'Trend Analysis'] : []),
        ...(reportData.includeDetailedStats ? ['Detailed Statistics', 'Error Analysis'] : []),
        ...(reportData.includeRecommendations ? ['Improvement Recommendations'] : []),
        'Conclusion',
      ],
    };
  };

  const reportPreview = getReportPreview();

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getImprovementInsight = () => {
    const wpmChart = progressCharts.find(chart => chart.type === 'wpm');
    const accuracyChart = progressCharts.find(chart => chart.type === 'accuracy');
    
    const insights = [];
    
    if (wpmChart && wpmChart.trendPercentage > 0) {
      insights.push(`Speed improved by ${wpmChart.trendPercentage.toFixed(1)}%`);
    }
    
    if (accuracyChart && accuracyChart.trendPercentage > 0) {
      insights.push(`Accuracy improved by ${accuracyChart.trendPercentage.toFixed(1)}%`);
    }
    
    if (overview.improvementRate > 0) {
      insights.push(`Overall improvement rate: ${overview.improvementRate.toFixed(1)}%`);
    }
    
    return insights.length > 0 ? insights : ['Continue practicing to see improvement trends'];
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Generate Report
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onExportData('csv')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={() => onExportData('json')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            Export JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Report Configuration */}
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            Report Configuration
          </h4>
          
          <div className="space-y-4">
            {/* Time Period */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time Period
              </label>
              <select
                value={reportData.period}
                onChange={(e) => setReportData({ ...reportData, period: e.target.value as 'week' | 'month' | 'quarter' | 'year' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="quarter">Last Quarter</option>
                <option value="year">Last Year</option>
              </select>
            </div>

            {/* Report Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Format
              </label>
              <select
                value={reportData.format}
                onChange={(e) => setReportData({ ...reportData, format: e.target.value as 'pdf' | 'html' | 'json' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pdf">PDF Report</option>
                <option value="html">HTML Report</option>
                <option value="json">JSON Data</option>
              </select>
            </div>

            {/* Include Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Include in Report
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={reportData.includeCharts}
                    onChange={(e) => setReportData({ ...reportData, includeCharts: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Progress Charts & Visualizations
                  </span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={reportData.includeDetailedStats}
                    onChange={(e) => setReportData({ ...reportData, includeDetailedStats: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Detailed Statistics & Error Analysis
                  </span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={reportData.includeRecommendations}
                    onChange={(e) => setReportData({ ...reportData, includeRecommendations: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Improvement Recommendations
                  </span>
                </label>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateReport}
              disabled={isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating Report...
                </>
              ) : (
                <>
                  📊 Generate Report
                </>
              )}
            </button>
          </div>
        </div>

        {/* Report Preview */}
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            Report Preview
          </h4>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
            {/* Report Header */}
            <div className="border-b border-gray-200 dark:border-gray-600 pb-3">
              <h5 className="font-semibold text-gray-900 dark:text-white">
                {reportPreview.title}
              </h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generated on {reportPreview.date}
              </p>
            </div>

            {/* Key Metrics Preview */}
            <div>
              <h6 className="font-medium text-gray-900 dark:text-white mb-2">
                Key Metrics Summary
              </h6>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white dark:bg-gray-800 p-2 rounded">
                  <div className="text-gray-600 dark:text-gray-400">Tests Completed</div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {overview.totalTests}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-2 rounded">
                  <div className="text-gray-600 dark:text-gray-400">Average WPM</div>
                  <div className="font-semibold text-blue-600 dark:text-blue-400">
                    {overview.averageWpm}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-2 rounded">
                  <div className="text-gray-600 dark:text-gray-400">Average Accuracy</div>
                  <div className="font-semibold text-green-600 dark:text-green-400">
                    {overview.averageAccuracy}%
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-2 rounded">
                  <div className="text-gray-600 dark:text-gray-400">Time Practiced</div>
                  <div className="font-semibold text-purple-600 dark:text-purple-400">
                    {formatTime(overview.totalTimeSpent)}
                  </div>
                </div>
              </div>
            </div>

            {/* Report Sections */}
            <div>
              <h6 className="font-medium text-gray-900 dark:text-white mb-2">
                Report Sections
              </h6>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {reportPreview.sections.map((section, index) => (
                  <li key={index} className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                    {section}
                  </li>
                ))}
              </ul>
            </div>

            {/* Insights Preview */}
            <div>
              <h6 className="font-medium text-gray-900 dark:text-white mb-2">
                Key Insights
              </h6>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {getImprovementInsight().map((insight, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Automated Reports Section */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
          Automated Reports
        </h4>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-blue-500 dark:text-blue-400 text-xl mt-0.5">📧</div>
            <div>
              <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Email Reports (Coming Soon)
              </h5>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                Get automated weekly or monthly progress reports delivered to your email.
              </p>
              <div className="flex items-center space-x-4 text-sm">
                <label className="flex items-center text-blue-700 dark:text-blue-300">
                  <input type="checkbox" className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 mr-2" />
                  Weekly Summary
                </label>
                <label className="flex items-center text-blue-700 dark:text-blue-300">
                  <input type="checkbox" className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 mr-2" />
                  Monthly Report
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};