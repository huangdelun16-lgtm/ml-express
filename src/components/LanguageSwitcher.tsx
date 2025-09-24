import React, { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { Language, ExpandMore } from '@mui/icons-material';

export type LanguageType = 'zh' | 'en' | 'my';

interface LanguageSwitcherProps {
  currentLanguage: LanguageType;
  onLanguageChange: (language: LanguageType) => void;
  variant?: 'header' | 'admin';
}

const languages = [
  {
    code: 'zh' as LanguageType,
    name: '中文',
    englishName: 'Chinese',
    flag: '🇨🇳',
  },
  {
    code: 'en' as LanguageType,
    name: 'English',
    englishName: 'English',
    flag: '🇺🇸',
  },
  {
    code: 'my' as LanguageType,
    name: 'မြန်မာ',
    englishName: 'Myanmar',
    flag: '🇲🇲',
  },
];

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  currentLanguage,
  onLanguageChange,
  variant = 'header',
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageSelect = (language: LanguageType) => {
    onLanguageChange(language);
    handleClose();
  };

  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

  if (variant === 'admin') {
    return (
      <Box>
        <Button
          onClick={handleClick}
          sx={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            color: 'white',
            px: 2,
            py: 1,
            minWidth: '120px',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.2)',
              transform: 'translateY(-1px)',
              boxShadow: '0 8px 32px rgba(255, 255, 255, 0.1)',
            },
            transition: 'all 0.3s ease',
          }}
          endIcon={<ExpandMore />}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '1.2rem' }}>{currentLang.flag}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {currentLang.name}
            </Typography>
          </Box>
        </Button>

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          PaperProps={{
            sx: {
              background: 'rgba(15, 32, 39, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              minWidth: '180px',
              boxShadow: '0 16px 64px rgba(0, 0, 0, 0.3)',
            },
          }}
        >
          {languages.map((language) => (
            <MenuItem
              key={language.code}
              onClick={() => handleLanguageSelect(language.code)}
              selected={language.code === currentLanguage}
              sx={{
                color: 'white',
                py: 1.5,
                px: 2,
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.1)',
                },
                '&.Mui-selected': {
                  background: 'rgba(25, 118, 210, 0.2)',
                  '&:hover': {
                    background: 'rgba(25, 118, 210, 0.3)',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: '40px' }}>
                <Typography sx={{ fontSize: '1.5rem' }}>{language.flag}</Typography>
              </ListItemIcon>
              <ListItemText
                primary={language.name}
                secondary={language.englishName}
                primaryTypographyProps={{
                  fontWeight: 600,
                  color: 'white',
                }}
                secondaryTypographyProps={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.75rem',
                }}
              />
            </MenuItem>
          ))}
        </Menu>
      </Box>
    );
  }

  return (
    <Box>
      <Button
        onClick={handleClick}
        sx={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '20px',
          color: 'white',
          px: 2,
          py: 0.5,
          minWidth: '100px',
          textTransform: 'none',
          fontWeight: 600,
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.2)',
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.3s ease',
        }}
        startIcon={<Language />}
        endIcon={<ExpandMore />}
      >
        <Typography sx={{ fontSize: '1rem', mr: 0.5 }}>{currentLang.flag}</Typography>
        {currentLang.code.toUpperCase()}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '12px',
            minWidth: '160px',
            boxShadow: '0 16px 64px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        {languages.map((language) => (
          <MenuItem
            key={language.code}
            onClick={() => handleLanguageSelect(language.code)}
            selected={language.code === currentLanguage}
            sx={{
              py: 1.5,
              px: 2,
              '&:hover': {
                background: 'rgba(25, 118, 210, 0.1)',
              },
              '&.Mui-selected': {
                background: 'rgba(25, 118, 210, 0.2)',
                '&:hover': {
                  background: 'rgba(25, 118, 210, 0.3)',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: '40px' }}>
              <Typography sx={{ fontSize: '1.3rem' }}>{language.flag}</Typography>
            </ListItemIcon>
            <ListItemText
              primary={language.name}
              secondary={language.englishName}
              primaryTypographyProps={{
                fontWeight: 600,
              }}
              secondaryTypographyProps={{
                color: 'text.secondary',
                fontSize: '0.75rem',
              }}
            />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default LanguageSwitcher;
